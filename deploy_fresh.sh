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

cd backend

composer install --optimize-autoloader --no-dev --prefer-dist

echo "⚠️  Wiping database and re-seeding with fresh data..."
php artisan migrate:fresh --seed --force

php artisan optimize
php artisan up

echo "✅ [FRESH DEPLOY] Done – database has been fully refreshed and seeded."
echo "⚠️  IMPORTANT: Revert Render's Build Command back to normal deploy.sh now."
