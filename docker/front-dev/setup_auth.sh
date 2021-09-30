#!/bin/bash

# create JWT cert (public+private key) on auth server

cd /opt/auth-server-poc/cert/
openssl ecparam -genkey -name prime256v1 -noout -out private.pem
openssl ec -in private.pem -pubout -out public.pem
chgrp www-data private.pem
chmod g+r private.pem

echo "cnaas:\$apr1\$F5MhM0EK\$Jeo6iMO9bubcMPI0Dth6N1" >> /opt/auth-server-poc/userdb/.htpasswd

killall uwsgi
