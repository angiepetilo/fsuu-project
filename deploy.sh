#!/usr/bin/env bash
set -e

echo "🚀 Starting Production Deployment..."

# 1. Pull latest code
echo "📥 Pulling latest git repository updates..."
git pull origin main

# 2. Build and optimize Frontend
echo "📦 Building Frontend production bundle..."
cd frontend
npm ci --prefer-offline --no-audit
npm run build
cd ..

# 3. Optimize Backend
echo "⚡ Optimizing Laravel Backend..."
cd backend
composer install --optimize-autoloader --no-dev --prefer-dist
php artisan down || true
php artisan migrate --force
php artisan optimize
php artisan up
cd ..

echo "✅ Production Deployment Completed Successfully!"
