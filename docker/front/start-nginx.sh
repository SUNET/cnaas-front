#!/bin/sh

sed -e "s|^\(.*proxy_pass \)CNAAS_API_URL;$|\1 $CNAAS_API_URL;|" \
    -e "s|^\(.*proxy_pass \)CNAAS_AUTH_URL;$|\1 $CNAAS_AUTH_URL;|" \
  < /etc/nginx/sites-available/nginx_app.conf > /tmp/nginx_app.conf.new \
  && cat /tmp/nginx_app.conf.new > /etc/nginx/sites-available/nginx_app.conf

/usr/sbin/nginx -g "daemon off;"
