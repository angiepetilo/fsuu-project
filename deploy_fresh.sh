#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy_fresh.sh  –  ONE-TIME ONLY: fresh migrate + seed on Render
#
# USAGE ON RENDER:
#   Build Command: bash deploy_fresh.sh
#
# After this deploy completes, Render's Build Command should be reverted back
# to the normal deploy.sh (or the Render dashboard command) to avoid wiping
# data on every future deploy.
#
# This file is listed in .gitignore and will not be committed again after
# the initial push.
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "🚀 [FRESH DEPLOY] Starting one-time migrate:fresh --seed..."

# 1. Pull latest code
echo "📥 Pulling latest git repository updates..."
git pull origin main || true

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

# 3. Optimize Backend & Fresh Migrate Seed
echo "⚡ Optimizing Laravel Backend..."
cd backend
composer install --optimize-autoloader --no-dev --prefer-dist

echo "⚠️  Wiping database and re-seeding with fresh data..."
php artisan migrate:fresh --seed --force

php artisan optimize
php artisan up

echo "✅ [FRESH DEPLOY] Done – database has been fully refreshed and seeded."
echo "⚠️  IMPORTANT: Revert Render's Build Command back to normal deploy.sh now."
