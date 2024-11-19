#!/bin/bash

set -e
set -x

export DEBIAN_FRONTEND noninteractive

apt update && \
    apt -y dist-upgrade && \
    apt install -y \
      git \
      nodejs \
      npm \
      iputils-ping \
      procps \
      bind9-host \
      netcat-openbsd \
      netcat-traditional \
      net-tools \
      curl \
      nginx \
      supervisor \
      libssl-dev \
    && apt clean \
    && apt autoremove -y

# Fetch the code and install dependencies
cd /opt/cnaas/
git clone https://github.com/SUNET/cnaas-front.git
cd cnaas-front/
npm i
#npm run-script build
#cp dist/* /opt/cnaas/static

