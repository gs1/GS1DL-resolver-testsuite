FROM php:8.2-cli

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install curl

COPY . /app/

EXPOSE 8000

CMD ["php", "-S", "0.0.0.0:8000", "tester.php"]