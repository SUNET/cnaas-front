FROM node:22 AS build

RUN mkdir -p /opt/cnaas-front

WORKDIR /opt/cnaas-front

COPY package*.json ./

RUN npm install --ignore-scripts

COPY src src
COPY docker/front/config/build.env .env

# Update js files to reference window instead of process.env
RUN find /opt/cnaas-front/src -type f -name '*.js' -exec \
    sed -i "s|process\.env\.|window\.|g" '{}' +

RUN npm run-script build

FROM nginx:1.27.0-alpine

RUN mkdir -p /opt/cnaas/static/styles /opt/cnaas/cert

COPY --from=build /opt/cnaas-front/dist/* /opt/cnaas/static
COPY src/styles/*.css /opt/cnaas/static/styles/

# Copy over nginx config
COPY docker/front/config/nginx_app.conf /etc/nginx/conf.d/default.conf
COPY docker/front/config/nginx.conf /etc/nginx/
COPY docker/front/cert/* /etc/nginx/conf.d/

# Copy over pre-start script
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
