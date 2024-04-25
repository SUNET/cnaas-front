#!/bin/sh

export CNAAS_HTTPD_URL=`echo $CNAAS_API_URL | sed 's/https/http/g'`

sed -e "s|^\(.*proxy_pass \)CNAAS_API_URL;$|\1$CNAAS_API_URL;|" \
    -e "s|^\(.*proxy_pass \)CNAAS_AUTH_URL;$|\1$CNAAS_AUTH_URL;|" \
    -e "s|^\(.*proxy_pass \)CNAAS_HTTPD_URL;$|\1$CNAAS_HTTPD_URL;|" \
  < /etc/nginx/sites-available/nginx_app.conf > /tmp/nginx_app.conf.new \
  && cat /tmp/nginx_app.conf.new > /etc/nginx/sites-available/nginx_app.conf

sed -e "s|^\(.*API_URL=\)CNAAS_FRONT_URL$|\1$CNAAS_FRONT_URL|" \
    -e "s|^\(.*FIRMWARE_URL=\)CNAAS_FIRMWARE_URL$|\1$CNAAS_FIRMWARE_URL|" \
    -e "s|^\(.*FIRMWARE_REPO_URL=\)CNAAS_FIRMWARE_REPO_URL$|\1$CNAAS_FIRMWARE_REPO_URL|" \
    -e "s|^\(.*FIRMWARE_REPO_METADATA_URL=\)CNAAS_FIRMWARE_REPO_METADATA_URL$|\1$CNAAS_FIRMWARE_REPO_METADATA_URL|" \
    -e "s|^\(.*TEMPLATES_WEB_URL=\)TEMPLATES_WEB_URL$|\1$TEMPLATES_WEB_URL|" \
    -e "s|^\(.*SETTINGS_WEB_URL=\)SETTINGS_WEB_URL$|\1$SETTINGS_WEB_URL|" \
    -e "s|^\(.*MONITORING_WEB_URL=\)MONITORING_WEB_URL$|\1$MONITORING_WEB_URL|" \
    -e "s|^\(.*OIDC_ENABLED=\)OIDC_ENABLED$|\1$OIDC_ENABLED|" \
    -e "s|^\(.*PERMISSIONS_DISABLED=\)PERMISSIONS_DISABLED$|\1$PERMISSIONS_DISABLED|" \
  < /opt/cnaas/.env > /tmp/.env \
  && cat /tmp/.env > /opt/cnaas/cnaas-front/.env

cd /opt/cnaas/cnaas-front
npm run-script build
cp dist/* /opt/cnaas/static
cp /opt/cnaas/cnaas-front/public/styles/*.css /opt/cnaas/static/styles/

if [ ! -f /opt/cnaas/cert/cnaasfront_combined.crt ]; then
  echo "WARNING: no cert found, using snakeoil cert"
  cp /etc/nginx/conf.d/snakeoil.crt /opt/cnaas/cert/cnaasfront_combined.crt
  cp /etc/nginx/conf.d/snakeoil.key /opt/cnaas/cert/cnaasfront.key
fi
chown root:root /opt/cnaas/cert/cnaasfront.key
chmod 600 /opt/cnaas/cert/cnaasfront.key

/usr/sbin/nginx -g "daemon off;"
