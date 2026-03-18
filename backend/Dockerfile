FROM node:18-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Download Roboto font for Vietnamese PDF support
RUN node scripts/downloadFont.js || true

EXPOSE 5000

CMD ["node", "server.js"]
