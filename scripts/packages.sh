#!/bin/bash

set -e
set -x

# Update and install packages
apt-get update
apt-get -y dist-upgrade
apt-get -y install \
	nginx \
	supervisor \
	build-essential \
	python3-dev \
	python-virtualenv \
	python3-pip
	
apt-get clean
pip3 install uwsgi

# Create virtualenv
virtualenv -p python3 /opt/cnaas
cd /opt/cnaas
source bin/activate

# Install pip3
/opt/cnaas/bin/pip install -U pip

# Install requirements
python3 -m pip install -r requirements.txt
