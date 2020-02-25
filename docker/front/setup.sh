#!/bin/bash

set -e
set -x

export DEBIAN_FRONTEND noninteractive

/bin/sed -i s/deb.debian.org/ftp.se.debian.org/g /etc/apt/sources.list

apt-get update && \
    apt-get -y dist-upgrade && \
    apt-get install -y \
      git \
      nodejs \
      npm \
      iputils-ping \
      procps \
      bind9-host \
      netcat-openbsd \
      net-tools \
      curl \
      netcat \
      nginx \
      supervisor \
      libssl-dev \
    && apt-get clean

# Fetch the code and install dependencies
cd /opt/cnaas/
git clone https://github.com/SUNET/cnaas-front.git
cd cnaas-front/
npm i
#npm run-script build
#cp dist/* /opt/cnaas/static

