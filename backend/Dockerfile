FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN apk add --no-cache su-exec curl \
  && chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/logs

ENV NODE_ENV=production
EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

