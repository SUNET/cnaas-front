FROM debian:buster

# Create directories
RUN mkdir -p /opt/cnaas
RUN mkdir /opt/cnaas/static
RUN mkdir /opt/cnaas/static/styles

# Setup script
COPY setup.sh /opt/cnaas/setup.sh
RUN /opt/cnaas/setup.sh

# Prepare for supervisord, uwsgi, ngninx
COPY config/supervisord_app.conf /etc/supervisor/supervisord.conf
COPY config/nginx_app.conf /etc/nginx/sites-available/
COPY config/nginx.conf /etc/nginx/
COPY cert/* /etc/nginx/conf.d/
COPY index.html /opt/cnaas/static/
COPY styles/* /opt/cnaas/static/styles/
COPY start-nginx.sh /opt/cnaas/

# Give nginx some special treatment
RUN unlink /etc/nginx/sites-enabled/default
RUN ln -s /etc/nginx/sites-available/nginx_app.conf /etc/nginx/sites-enabled/default
RUN chown www-data:www-data /var/log/nginx
RUN chown -R  www-data:www-data /var/log/nginx/
RUN chown -R www-data:www-data /var/lib/nginx
RUN chown www-data:www-data /var/lib/nginx/
RUN chown root:www-data /opt/cnaas/start-nginx.sh
RUN chmod g+rx /opt/cnaas/start-nginx.sh
RUN chown root:www-data /etc/nginx/sites-available/nginx_app.conf
RUN chmod g+rw /etc/nginx/sites-available/nginx_app.conf


# Expose HTTPS
EXPOSE 4443

ENTRYPOINT supervisord -c /etc/supervisor/supervisord.conf

