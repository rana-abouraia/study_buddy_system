FROM node:22-slim

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

WORKDIR /usr/src/app

# Prisma + system dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate
# Prisma generate only needs a syntactically valid URL at build time.
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/app" npx prisma generate
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

EXPOSE 4006

CMD ["npm", "start"]
