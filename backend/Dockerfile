FROM php:8.2-fpm

# Install system dependencies & PHP extensions
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libsqlite3-dev \
    zip \
    unzip \
    nginx \
    ca-certificates

# Clear apt cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions required by Laravel
RUN docker-php-ext-install pdo pdo_mysql pdo_sqlite mbstring exif pcntl bcmath gd

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Configure Composer environment settings for resilient network downloads
ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_PROCESS_TIMEOUT=2000 \
    COMPOSER_MAX_PARALLEL_HTTP=1

# Copy composer files first for optimal Docker layer caching
COPY composer.json composer.lock* /var/www/

# Install Composer dependencies with git-clone fallback (bypasses GitHub 429 rate limits)
RUN composer config --global process-timeout 2000 && \
    (composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist || \
     composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-source)

# Copy existing application code
COPY . /var/www

# Generate optimized classmap autoloader
RUN composer dump-autoload --optimize --no-dev

# Ensure .env file exists and setup permissions
RUN cp .env.example .env && \
    php artisan key:generate --force && \
    touch /var/www/database/database.sqlite && \
    chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache /var/www/database /var/www/.env && \
    chmod -R 777 /var/www/storage /var/www/bootstrap/cache /var/www/database /var/www/.env

# Copy Nginx configuration
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Default environment variables for production execution
ENV APP_ENV=production \
    APP_DEBUG=true \
    LOG_CHANNEL=stderr \
    DB_CONNECTION=sqlite \
    DB_DATABASE=/var/www/database/database.sqlite \
    SESSION_DRIVER=file \
    QUEUE_CONNECTION=sync \
    FRONTEND_URL=https://fsuu-project.vercel.app \
    GOOGLE_REDIRECT_URI=https://fsuu-project.onrender.com/api/auth/google/callback \
    RESEND_API_KEY="" \
    MAIL_MAILER=smtp \
    MAIL_HOST=smtp.gmail.com \
    MAIL_PORT=465 \
    MAIL_USERNAME=angie.petilo@urios.edu.ph \
    MAIL_PASSWORD="lsjm movr csbz yqoc" \
    MAIL_ENCRYPTION=ssl \
    MAIL_FROM_ADDRESS="angie.petilo@urios.edu.ph" \
    MAIL_FROM_NAME="FSUU Reserve and Booking System" \
    MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt

# Expose port
EXPOSE 80

CMD ["sh", "-c", "sed -i 's/PORT_PLACEHOLDER/'\"${PORT:-80}\"'/g' /etc/nginx/sites-available/default && touch /var/www/database/database.sqlite && chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache /var/www/database /var/www/.env && chmod -R 777 /var/www/storage /var/www/bootstrap/cache /var/www/database /var/www/.env && composer dump-autoload -o && php artisan config:clear && php artisan route:clear && php artisan storage:link || true && php-fpm -D && php artisan migrate:fresh --force --seed && nginx -g 'daemon off;'"]
