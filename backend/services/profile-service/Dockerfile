FROM node:22-slim

WORKDIR /usr/src/app

# Prisma + system dependencies
RUN apt-get update && apt-get install -y openssl

# Install dependencies first (cache optimization)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy full source
COPY . .

# Prisma generate (only if exists)
RUN DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/hivemind-user?branch=profile-db&sslmode=require" npx prisma generate

# Build TypeScript (only if TS exists)
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

EXPOSE 4002

CMD ["npm", "start"]