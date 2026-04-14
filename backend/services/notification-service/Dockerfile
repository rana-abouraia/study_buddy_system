ARG NODE_VERSION=22.19.0

FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

COPY src ./src
COPY tsconfig.json ./tsconfig.json
COPY prisma.config.ts ./prisma.config.ts

ENV NODE_ENV=development

EXPOSE 4006

CMD ["npm", "run", "dev"]
