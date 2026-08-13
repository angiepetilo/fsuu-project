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

# Ensure database directory and database.sqlite file exist with correct permissions
RUN touch /var/www/database/database.sqlite && \
    chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache /var/www/database && \
    chmod -R 775 /var/www/storage /var/www/bootstrap/cache /var/www/database

# Copy Nginx configuration
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Expose port
EXPOSE 80

CMD ["sh", "-c", "sed -i 's/PORT_PLACEHOLDER/'\"${PORT:-80}\"'/g' /etc/nginx/sites-available/default && touch /var/www/database/database.sqlite && chown www-data:www-data /var/www/database/database.sqlite && php artisan migrate:fresh --force --seed && php artisan config:cache && php artisan route:cache && php-fpm -D && nginx -g 'daemon off;'"]
