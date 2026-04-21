FROM node:22-slim

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

EXPOSE 4001

CMD ["npm", "start"]
