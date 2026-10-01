#!/bin/sh
set -e

if [ "$DB_CONNECTION" = "pgsql" ]; then
  DEFAULT_PORT="5432"
else
  DEFAULT_PORT="3306"
fi

DB_TARGET_HOST="${DB_HOST:-127.0.0.1}"
DB_TARGET_PORT="${DB_PORT:-$DEFAULT_PORT}"

echo "⏳ Checking database connection at ${DB_TARGET_HOST}:${DB_TARGET_PORT} (Driver: ${DB_CONNECTION:-mysql})..."

if [ "$DB_TARGET_HOST" != "127.0.0.1" ] && [ "$DB_TARGET_HOST" != "localhost" ]; then
  MAX_RETRIES=15
  COUNT=0
  until nc -z -v -w5 "$DB_TARGET_HOST" "$DB_TARGET_PORT"; do
    COUNT=$((COUNT+1))
    echo "[$COUNT/$MAX_RETRIES] Waiting for database at ${DB_TARGET_HOST}:${DB_TARGET_PORT}..."
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
      echo "⚠️ Database connection wait timeout reached. Continuing to start..."
      break
    fi
    sleep 2
  done
fi

echo "🚀 Running database migrations..."
php artisan migrate --force

echo "🚀 Optimizing configuration..."
php artisan optimize || true

# Launch background queue worker if queue connection is asynchronous
if [ "${QUEUE_CONNECTION:-sync}" != "sync" ]; then
  echo "🚀 Starting background queue worker..."
  php artisan queue:work --tries=3 --timeout=90 &
fi

# Launch background scheduler worker if ENABLE_SCHEDULER is enabled
if [ "${ENABLE_SCHEDULER:-false}" = "true" ]; then
  echo "🚀 Starting background scheduler worker..."
  php artisan schedule:work &
fi

# The entrypoint runs as root (required so Nginx can bind the port and
# PHP-FPM's master can spawn www-data workers). Artisan commands above may
# have created/touched storage or cache files as root — re-assert www-data
# ownership so the unprivileged FPM workers can still write to them.
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

PORT_TO_SERVE="${PORT:-8000}"
FRONTEND_ORIGIN="${FRONTEND_URL:-https://fsuu-booking.pages.dev}"

echo "🚀 Rendering Nginx config (port ${PORT_TO_SERVE}, CORS origin ${FRONTEND_ORIGIN})..."
sed -e "s|PORT_PLACEHOLDER|${PORT_TO_SERVE}|g" \
    -e "s|FRONTEND_ORIGIN_PLACEHOLDER|${FRONTEND_ORIGIN}|g" \
    /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Run PHP-FPM and Nginx as background children (not --daemonize / exec) so
# this script stays alive as PID 1 and can forward termination signals to
# both on container shutdown — otherwise one process would be orphaned and
# killed abruptly instead of shutting down its workers gracefully.
echo "🚀 Starting PHP-FPM..."
php-fpm &
FPM_PID=$!

# Give FPM a moment to bind its listen socket before Nginx starts proxying to it
for i in $(seq 1 10); do
  if nc -z 127.0.0.1 9000 2>/dev/null; then
    break
  fi
  sleep 0.5
done

echo "🌟 Starting Nginx on port ${PORT_TO_SERVE}..."
nginx -g "daemon off;" &
NGINX_PID=$!

shutdown() {
  echo "🛑 Shutting down Nginx and PHP-FPM..."
  kill -TERM "$NGINX_PID" 2>/dev/null || true
  kill -TERM "$FPM_PID" 2>/dev/null || true
  wait "$NGINX_PID" 2>/dev/null || true
  wait "$FPM_PID" 2>/dev/null || true
  exit 0
}
trap shutdown TERM INT

# Block on Nginx (the primary foreground process). If Nginx exits for any
# reason the container exits too, which lets Render restart it; `wait -n`
# (bash-only) is avoided since this script runs under Alpine's /bin/sh (ash).
wait "$NGINX_PID"
