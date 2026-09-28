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

# Copy built frontend assets and template to backend
cp -r frontend/dist/assets/* backend/public/assets/
cp frontend/dist/index.html backend/resources/views/app.blade.php
cp frontend/dist/index.html backend/public/index.html

# 3. Optimize Backend
echo "⚡ Optimizing Laravel Backend..."
cd backend
composer install --optimize-autoloader --no-dev --prefer-dist
if [ "$MIGRATE_FRESH" = "true" ] || [ "$FORCE_FRESH_MIGRATE" = "true" ] || [ -f "database/.force_fresh_migrate" ] || [ -f ".force_fresh_migrate" ] || [ -f "../.force_fresh_migrate" ]; then
    echo "⚠️ Running force migrate:fresh --seed --force..."
    php artisan migrate:fresh --seed --force
    rm -f database/.force_fresh_migrate || true
    rm -f .force_fresh_migrate || true
    rm -f ../.force_fresh_migrate || true
else
    echo "🛡️ Running safe database migrations (preserving production data)..."
    php artisan migrate --force
fi
php artisan optimize
php artisan up
cd ..

echo "✅ Production Deployment Completed Successfully!"
