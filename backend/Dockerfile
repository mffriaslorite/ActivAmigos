# Imagen base exacta que usas en local
FROM python:3.12-slim

# Evita prompts en apt y acelera pip
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ---- Dependencias del sistema ----
# libpq-dev y gcc: para compilar psycopg2 (si usas psycopg2-binary, puedes omitirlos)
# libjpeg-dev y zlib1g-dev: para Pillow (generación de iconos)
# ca-certificates y curl: utilidades básicas y SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc \
    libpq-dev \
    libjpeg-dev zlib1g-dev \
    ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# ---- Python deps ----
# Copiamos primero requirements para aprovechar la cache de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Si vas a generar iconos en memoria (recomendado), asegúrate de tener Pillow
# (si ya está en requirements.txt, esta línea no hace falta)
RUN pip install --no-cache-dir Pillow

# ---- Código ----
COPY . .

# Puerto de Flask/Gunicorn si expones la API
EXPOSE 5000

# Variables típicas de Flask (puedes ajustar)
ENV FLASK_APP=app.py \
    FLASK_ENV=production

# Install Gunicorn for production
RUN pip install --no-cache-dir gunicorn gevent

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["gunicorn", "--worker-class", "geventwebsocket.gunicorn.workers.GeventWebSocketWorker", "--workers", "1", "--bind", "0.0.0.0:5000", "app:app"]





# FROM python:3.11-slim

# WORKDIR /app

# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# COPY . .

# # Instala Pillow si vas a generar iconos sin internet
# RUN pip install Pillow

# EXPOSE 5000
# CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
