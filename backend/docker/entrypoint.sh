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

# Seed database only if users table is empty (first deploy)
if [ "${AUTO_SEED:-false}" = "true" ]; then
  USER_COUNT=$(php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tail -n1)
  if [ "$USER_COUNT" = "0" ]; then
    echo "🌱 Seeding database (first deployment)..."
    php artisan db:seed --force
  else
    echo "⏭️  Skipping seed (users already exist: $USER_COUNT)"
  fi
fi

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

PORT_TO_SERVE="${PORT:-8000}"
echo "🌟 Starting HTTP server on port ${PORT_TO_SERVE}..."
exec php artisan serve --host=0.0.0.0 --port="${PORT_TO_SERVE}" --no-reload
