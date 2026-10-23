FROM php:8.2-apache

# 1. Instalar librerías del sistema y extensiones PHP para PDO SQLite y MySQL
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_sqlite pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# 2. Habilitar mod_rewrite y headers en Apache
RUN a2enmod rewrite headers

# 3. Configurar DocumentRoot hacia la carpeta public/ del backend
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# 4. Copiar script de arranque para soporte de puerto dinámico en Render ($PORT)
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 5. Copiar el código del backend
WORKDIR /var/www/html
COPY . /var/www/html/

# 6. Permisos de escritura para base de datos SQLite y subida de PDFs
RUN mkdir -p /var/www/html/public/uploads/documents \
    && mkdir -p /var/www/html/src/Database \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/public/uploads \
    && chmod -R 775 /var/www/html/src/Database

EXPOSE 80 10000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
