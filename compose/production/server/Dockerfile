FROM python:3.13-slim

# Prevent Python from writing .pyc files and enable unbuffered logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    wait-for-it \
    && rm -rf /var/lib/apt/lists/*

COPY ./Server/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY ./Server /app

# Entrypoint (production version)
COPY ./compose/production/server/entrypoint /entrypoint
RUN chmod +x /entrypoint

COPY ./compose/production/server/start /start
RUN chmod +x /start

ENTRYPOINT ["/entrypoint"]
