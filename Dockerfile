FROM php:8.2-cli

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install curl

COPY . /app/

# Copy static files to public if they don't exist there
RUN cp -n *.js public/ 2>/dev/null || true && \
    cp -n *.css public/ 2>/dev/null || true && \
    cp -n *.json public/ 2>/dev/null || true && \
    cp -n *.gif public/ 2>/dev/null || true

EXPOSE 8000

CMD ["php", "-S", "0.0.0.0:8000", "tester.php"]