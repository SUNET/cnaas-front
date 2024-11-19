# live mount the source code into a Docker container and serve it with npm

FROM node:22
ENV DEBIAN_FRONTEND=noninteractive

RUN apt update && apt install -y --no-install-recommends tini \
        iputils-ping \
        procps \
        bind9-host \
        netcat-openbsd \
        netcat-traditional \
        net-tools \
        curl \
        libssl-dev

WORKDIR /app

VOLUME ["/app"]
ENTRYPOINT ["/usr/bin/tini", "-v", "--"]
CMD /app/docker-entrypoint.sh
