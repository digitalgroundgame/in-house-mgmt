FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    wait-for-it \
    && rm -rf /var/lib/apt/lists/*

COPY ./Server/requirements.txt requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt

COPY ./compose/production/server/entrypoint /entrypoint
RUN chmod +x /entrypoint

COPY ./compose/dev/server/start /start
RUN chmod +x /start

ENTRYPOINT ["/entrypoint"]
