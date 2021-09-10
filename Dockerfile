# live mount the source code into a Docker container and serve it with npm

FROM node:current-buster
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends tini \
        iputils-ping \
        procps \
        bind9-host \
        netcat-openbsd \
        net-tools \
        curl \
        netcat \
        libssl-dev

WORKDIR /app

VOLUME ["/app"]
ENTRYPOINT ["/usr/bin/tini", "-v", "--"]
CMD /app/docker-entrypoint.sh
