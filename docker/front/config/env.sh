#!/bin/sh

VARS="CNAAS_API_URL \
CNAAS_AUTH_URL \
CNAAS_HTTPD_URL \
NETBOX_API_URL \
NETBOX_TENANT_ID \
NETBOX_API_TOKEN \
CNAAS_FIRMWARE_URL \
CNAAS_FIRMWARE_REPO_URL \
CNAAS_FIRMWARE_REPO_METADATA_URL \
TEMPLATES_WEB_URL \
SETTINGS_WEB_URL \
MONITORING_WEB_URL \
GRAPHITE_URL \
OIDC_ENABLED \
PERMISSIONS_DISABLED \
ARISTA_DETECT_ARCH"

# Set this variable dynamically
export CNAAS_HTTPD_URL=$(echo $CNAAS_API_URL | sed 's/https/http/g')

# Disable Netbox / Graphite in nginx config if not set.
if [ -z "$NETBOX_API_URL" ]; then
    echo "Disabling Netbox integration in nginx.conf"
    sed -i "/location.*netbox/,/}/d" /etc/nginx/conf.d/default.conf
fi

if [ -z "$GRAPHITE_URL" ]; then
    echo "Disabling Graphite integration in nginx.conf"
    sed -i "/location.*graphite/,/}/d" /etc/nginx/conf.d/default.conf
fi

# Update nginx with dynamic variables
for key in $VARS; do
    value=$(printenv "$key")
    if [ -n "$value" ]; then
        echo "Found $key"
        # Update nginx
        sed -i "s|${key}|${value}|g" /etc/nginx/conf.d/default.conf
    else
        echo "Environment variable $key not set, skipping"
    fi
done
echo "Done with setting environment variables in nginx"

if [ ! -f /opt/cnaas/cert/cnaasfront_combined.crt ]; then
  echo "WARNING: no cert found, using snakeoil cert"
  cp /etc/nginx/conf.d/snakeoil.crt /opt/cnaas/cert/cnaasfront_combined.crt
  cp /etc/nginx/conf.d/snakeoil.key /opt/cnaas/cert/cnaasfront.key
fi
chown nginx:nginx /opt/cnaas/cert/cnaasfront.key
chmod 600 /opt/cnaas/cert/cnaasfront.key

# Create config.js dynamically using a here-doc
cat > "/opt/cnaas/static/config.js" <<EOF
var API_URL = "${CNAAS_FRONT_URL:-${CNAAS_API_URL:-}}"
var AUTH_URL = "${CNAAS_AUTH_URL:-}";
var NETBOX_API_URL = "${NETBOX_API_URL:-}";
var NETBOX_TENANT_ID = "${NETBOX_TENANT_ID:-}";
var FIRMWARE_URL = "${CNAAS_FIRMWARE_URL:-}";
var TEMPLATES_WEB_URL = "${TEMPLATES_WEB_URL:-}";
var SETTINGS_WEB_URL = "${SETTINGS_WEB_URL:-}";
var MONITORING_WEB_URL = "${MONITORING_WEB_URL:-}";
var FIRMWARE_REPO_METADATA_URL = "${CNAAS_FIRMWARE_REPO_METADATA_URL:-}";
var FIRMWARE_REPO_URL = "${CNAAS_FIRMWARE_REPO_URL:-}";
var OIDC_ENABLED = "${OIDC_ENABLED:-}";
var ARISTA_DETECT_ARCH = "${ARISTA_DETECT_ARCH:-}";
var GRAPHITE_URL = "${GRAPHITE_URL:-}";
EOF

# Add config.js to index.html
sed -i '/<script type=module src=\/cnaas.*/a\
<script src="/config.js"></script>
' /opt/cnaas/static/index.html

