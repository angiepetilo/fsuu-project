#!/bin/sh
set -e

echo "⏳ Waiting for database connection..."
until nc -z -v -w30 db 3306; do
  echo "Waiting for MySQL database at db:3306..."
  sleep 2
done

echo "⚡ Database connected! Running fresh migrations and seeders..."
php artisan migrate:fresh --seed --force

echo "🚀 Caching routes and configuration..."
php artisan optimize

echo "🌟 Starting PHP-FPM..."
exec php-fpm
