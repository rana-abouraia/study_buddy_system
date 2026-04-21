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
RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; fi

# Build TypeScript (only if TS exists)
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

EXPOSE 4003

CMD ["npm", "start"]