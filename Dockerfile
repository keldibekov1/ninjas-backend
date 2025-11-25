FROM node:23.11.0-slim

RUN apt-get update && \
    apt-get install -y openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set environment
ENV NODE_ENV=production

# Add entrypoint script to run migrations on startup
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]