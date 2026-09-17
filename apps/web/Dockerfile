FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN if [ -z "$VITE_API_BASE_URL" ]; then \
      echo "VITE_API_BASE_URL is required for the production web image" >&2; \
      exit 1; \
    fi \
    && npm run build

FROM nginx:1.27-alpine AS runtime

ENV NGINX_ENVSUBST_FILTER=^PORT$ \
    PORT=80

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1
