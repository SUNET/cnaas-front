FROM debian:buster

MAINTAINER Kristofer Hallin "kristofer@sunet.se"

# Install packages etc
COPY . /opt/cnaas
RUN /opt/cnaas/scripts/packages.sh

# Copy files
COPY cert/* /etc/nginx/conf.d/
COPY config/supervisord.conf /etc/supervisor/supervisord.conf
COPY config/nginx.conf /etc/nginx/sites-available/

# Give nginx some special treatment
RUN unlink /etc/nginx/sites-enabled/default
RUN ln -s /etc/nginx/sites-available/nginx.conf /etc/nginx/sites-enabled/default

# Expose HTTPS
EXPOSE 443

ENTRYPOINT "supervisord"
