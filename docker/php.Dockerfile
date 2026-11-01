# PHP 8.5 for the dev API server (dev-server/), the Laravel/Filament package tests and the demo.
FROM php:8.5-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libicu-dev libzip-dev \
    && docker-php-ext-install intl zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_HOME=/composer
WORKDIR /app
