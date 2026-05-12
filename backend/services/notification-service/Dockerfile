FROM node:22-slim

WORKDIR /usr/src/app

# Prisma + system dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cache optimization)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy full source
COPY . .

# Prisma generate only needs a syntactically valid URL at build time.
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/app" npx prisma generate

# Build TypeScript (only if TS exists)
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

EXPOSE 4006

CMD ["npm", "start"]
