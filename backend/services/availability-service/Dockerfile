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
RUN DATABASE_URL="postgresql://neondb_owner:npg_SuLR9bZ7wPNB@ep-lingering-salad-an8b9l80-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" npx prisma generate

# Build TypeScript (only if TS exists)
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

EXPOSE 4003

CMD ["npm", "start"]