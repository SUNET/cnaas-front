#!/bin/sh

VARS="NETBOX_API_URL \
NETBOX_TENANT_ID \
NETBOX_API_TOKEN \
API_URL \
AUTH_URL \
HTTPD_URL \
GRAPHITE_URL \
FIRMWARE_URL \
FIRMWARE_REPO_URL \
FIRMWARE_REPO_METADATA_URL \
TEMPLATES_WEB_URL \
SETTINGS_WEB_URL \
MONITORING_WEB_URL \
OIDC_ENABLED \
PERMISSIONS_DISABLED \
ARISTA_DETECT_ARCH"

# Set this variable dynamically
export HTTPD_URL=$(echo $API_URL | sed 's/https/http/g')

# Disable Netbox / Graphite in nginx config if not set.
if [ -z "$NETBOX_API_URL" ]; then
    echo "Disabling Netbox integration in nginx.conf"
    sed -i "/location.*netbox/,/}/d" /etc/nginx/conf.d/default.conf
fi

if [ -z "$GRAPHITE_URL" ]; then
    echo "Disabling Graphite integration in nginx.conf"
    sed -i "/location.*graphite/,/}/d" /etc/nginx/conf.d/default.conf
fi

for key in $VARS; do
    value=$(printenv "$key")
    if [ -n "$value" ]; then
        echo "Found $key"
        # JS update
        find /opt/cnaas/static -type f -name '*.js' -exec \
            sed -i "s|${key}|${value}|g" '{}' +
        # Update nginx
        sed -i "s|${key}|${value}|g" /etc/nginx/conf.d/default.conf
    else
        echo "Environment variable $key not set, skipping"
    fi
done
echo "Done with setting environment variables in JS-files and nginx"

if [ ! -f /opt/cnaas/cert/cnaasfront_combined.crt ]; then
  echo "WARNING: no cert found, using snakeoil cert"
  cp /etc/nginx/conf.d/snakeoil.crt /opt/cnaas/cert/cnaasfront_combined.crt
  cp /etc/nginx/conf.d/snakeoil.key /opt/cnaas/cert/cnaasfront.key
fi
chown nginx:nginx /opt/cnaas/cert/cnaasfront.key
chmod 600 /opt/cnaas/cert/cnaasfront.key




