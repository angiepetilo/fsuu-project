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

echo "⚡ Running database migrations and seeders..."
php artisan migrate --force || true
php artisan db:seed --force || true

echo "🚀 Caching routes and configuration..."
php artisan optimize || true

PORT_TO_SERVE="${PORT:-8000}"
echo "🌟 Starting HTTP server on port ${PORT_TO_SERVE}..."
exec php artisan serve --host=0.0.0.0 --port="${PORT_TO_SERVE}" --no-reload
