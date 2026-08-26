#!/bin/sh
set -e

DB_TARGET_HOST="${DB_HOST:-127.0.0.1}"
DB_TARGET_PORT="${DB_PORT:-3306}"

echo "⏳ Checking database connection at ${DB_TARGET_HOST}:${DB_TARGET_PORT}..."

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

echo "⚡ Running migrations and seeders..."
php artisan migrate:fresh --seed --force || php artisan migrate --force || true

echo "🚀 Caching routes and configuration..."
php artisan optimize || true

echo "🌟 Starting PHP-FPM..."
exec php-fpm
