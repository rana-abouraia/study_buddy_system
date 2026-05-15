FROM node:20-slim AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

ARG VITE_GRAPHQL_URL
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

ENV PORT=80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
