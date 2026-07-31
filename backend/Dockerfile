FROM python:3.11-slim

WORKDIR /app

# Install OS packages Playwright/Chromium need that slim images omit.
# playwright install --with-deps handles most of these, but we pre-install
# a few that are reliably missing on debian-slim before that command runs.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download Playwright's bundled Chromium binary and install all remaining
# OS-level dependencies (libnss3, libatk, libgbm, libxkbcommon, etc).
# This adds ~380 MB to the image; acceptable for the live-scraper fallback.
RUN playwright install --with-deps chromium

COPY . .

RUN mkdir -p /data

ENV PORT=8080
ENV DB_PATH=/data/users.db

EXPOSE 8080

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "4", "--timeout", "120"]
