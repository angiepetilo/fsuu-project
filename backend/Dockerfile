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

# Copy existing application code
COPY . /var/www

# Install Composer dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

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
    RESEND_API_KEY="" \
    MAIL_MAILER=smtp \
    MAIL_HOST=smtp.gmail.com \
    MAIL_PORT=465 \
    MAIL_USERNAME=angie.petilo@urios.edu.ph \
    MAIL_PASSWORD="lsjm movr csbz yqoc" \
    MAIL_ENCRYPTION=ssl \
    MAIL_FROM_ADDRESS="angie.petilo@urios.edu.ph" \
    MAIL_FROM_NAME="FSUU Reserve and Booking System"

# Expose port
EXPOSE 80

CMD ["sh", "-c", "sed -i 's/PORT_PLACEHOLDER/'\"${PORT:-80}\"'/g' /etc/nginx/sites-available/default && touch /var/www/database/database.sqlite && chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache /var/www/database /var/www/.env && chmod -R 777 /var/www/storage /var/www/bootstrap/cache /var/www/database /var/www/.env && composer dump-autoload -o && php artisan config:clear && php artisan route:clear && php-fpm -D && php artisan migrate:fresh --force --seed && nginx -g 'daemon off;'"]
