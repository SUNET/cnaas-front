#!/bin/sh -ex

env
npm install --loglevel verbose
npm run-script build
exec npm run-script dockerstart
