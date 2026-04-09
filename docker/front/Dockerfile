# Inspired by https://docs.docker.com/guides/reactjs/containerize/

# Stage 1: builder
FROM node:22.22 AS builder

# Set the working directory inside the container
WORKDIR /opt/cnaas-front

# Copy package-related files first to leverage Docker's caching mechanism
COPY package*.json ./

RUN npm ci --ignore-scripts

COPY src src

# Update js files to reference window instead of process.env
RUN find /opt/cnaas-front/src -type f -name '*.js' -exec \
    sed -i "s|process\.env\.|window\.|g" '{}' +

RUN npm run build

# Stage 2: app
FROM nginx:1.28.1-alpine

LABEL org.opencontainers.image.vendor="SUNET"
LABEL org.opencontainers.image.source="https://github.com/SUNET/cnaas-front"
LABEL org.opencontainers.image.description="CNaaS Front"

RUN mkdir -p /opt/cnaas/static/styles /opt/cnaas/cert

# Copy app and styles
COPY --from=builder /opt/cnaas-front/dist/* /opt/cnaas/static/
COPY src/styles/*.css /opt/cnaas/static/styles/

# Copy nginx config
COPY docker/front/config/nginx_app.conf /etc/nginx/conf.d/default.conf
COPY docker/front/config/nginx.conf /etc/nginx/
COPY docker/front/cert/* /etc/nginx/conf.d/

# Copy pre-start script
COPY docker/front/config/env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh && \
    chown -R nginx:nginx \
    /var/cache/nginx \
    /opt/cnaas/cert \
    /opt/cnaas/static \
    /etc/nginx/conf.d \
    /docker-entrypoint.d/env.sh

USER nginx

# Expose HTTPS
EXPOSE 4443
