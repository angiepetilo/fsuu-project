# ==========================================
# 1. Base Stage: PHP 8.2 FPM with Extensions
# ==========================================
FROM php:8.2-fpm-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    nginx \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    mysql-client \
    postgresql-client \
    postgresql-dev \
    oniguruma-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libzip-dev \
    netcat-openbsd

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_pgsql \
        pgsql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        opcache

# Copy OPcache configuration and the production FPM pool definition
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/www.conf

# Install Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ==========================================
# 2. Build Stage: Dependencies & Caching
# ==========================================
FROM base AS build

# Copy composer files first to leverage Docker layer caching
COPY composer.json composer.lock ./

# Install production dependencies without dev packages
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy application source code
COPY . .

# Generate optimized autoloader
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Ensure proper file permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# ==========================================
# 3. Production Stage
# ==========================================
FROM base AS production

COPY --from=build --chown=www-data:www-data /var/www/html /var/www/html

# Nginx config template (PORT_PLACEHOLDER / FRONTEND_ORIGIN_PLACEHOLDER are
# substituted by entrypoint.sh at container startup, since Render only
# provides $PORT and env vars at runtime, not at build time)
COPY docker/nginx.conf /etc/nginx/http.d/default.conf.template
RUN mkdir -p /run/nginx

# Copy and make entrypoint script executable
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Nginx's master process and PHP-FPM's master process both need to start as
# root in order to bind the port and spawn workers as the unprivileged
# www-data user (configured via docker/php/www.conf). This matches standard
# practice for combined Nginx+PHP-FPM containers; each actually serves
# requests as www-data, never as root.

EXPOSE 8000 10000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
