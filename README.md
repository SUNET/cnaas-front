# cnaas-front

## simple standalone dev setup

1. download node
2. download npm
3. navigate to the cnaas-front folder
4. run `npm i` to install all the dependencies
5. run: `npm start` to bundle the js files
6. navigate to `http://localhost:1234` in browser


## full interactive dev setup with docker-compose

This guide will show you how to set up cnaas-nms on your local machine for development.
The components will run in Docker-containers.

The cnaas-nms frontend will also run inside a Docker container and update interactively with
every code change.


### clone the repositories

Clone the source code for frontend and API. Both should be in the same parent directory.

    git clone https://github.com/SUNET/cnaas-front.git cnaas-front
    git clone https://github.com/SUNET/cnaas-nms.git cnaas-nms


### setup and run docker-compose

Navigate to `cnaas-front/`.

    cd cnaas-front

You will find a `docker-compose.yaml` file here.

This file is used to run docker-compose and build all containers. This takes forever the first time.

    docker-compose up -d

As soon as the built is finished, docker-compose will start the containers.


### set up the auth container

A script will set up the auth container for you.
This script will create a certificate to verify JWTokens issued by the auth server.
It will also create a user named "cnaas" with password "cnaascnaascnaas".

    docker cp docker/front-dev/setup_auth.sh cnaas-front_auth_1:/opt/auth-server-poc/
    docker exec -t cnaas-front_auth_1 /bin/chmod u+x /opt/auth-server-poc/setup_auth.sh
    docker exec -t cnaas-front_auth_1 /opt/auth-server-poc/setup_auth.sh


### copy the key for JWT authentication

The public key file is used to verify JWTokens between the auth server and the API.
`public.pem` has to be copied from the auth container to the API container:

    docker cp cnaas-front_auth_1:/opt/auth-server-poc/cert/public.pem .
    docker cp public.pem cnaas-front_api_1:/opt/cnaas/jwtcert/public.pem
    rm public.pem
    docker exec -u root -t cnaas-front_api_1 /bin/chown root:www-data /opt/cnaas/jwtcert/public.pem

Then, restart the API application.

    docker exec -t cnaas-front_api_1 /usr/bin/killall uwsgi

Alternatively, you can restart the whole API container.

    docker-compose restart api


### add some devices to the database

    docker exec -i cnaas-front_postgres_1 /usr/bin/psql -U cnaas cnaas < docker/front-dev/cnaas.pgdump

Some errors and warnings will appear. You can ignore those.


### check it's all working

On the host system (that's your computer), you can now run the following commands to ensure that
everything is working: auth, API and frontend.


#### auth

    curl -ks https://localhost:2443/api/v1.0/auth -X POST -u cnaas -p

This should return an access token if you enter [the password](#set-up-the-auth-container)
correctly.
It should look something like this:

`{"access_token": "exceedingly.ridiculouslyrandomlylookinglongstring"}`

This token can be used to authenticate with the cnaas-nms REST API, instead of username/password.

Next, create a `.env` file and fill in the token (whatever was returned as the
exceedingly.ridiculouslyrandomlylookinglongstring without the JSON wrapper) as `JWT_AUTH_TOKEN`.

    echo 'JWT_AUTH_TOKEN="exceedingly.ridiculouslyrandomlylookinglongstring"' > .env


#### API

Next, load the token into the `JWT_AUTH_TOKEN` environment variable with `source` and define an
alias command that allows you to authenticate with the cnaas-nms REST API using this token.
(The alias is defined for the current shell session only. You can add the alias line to your
`.bashrc` to make it permanent.)

    source .env
    alias curlJ='curl -k -s -H "Authorization: Bearer $JWT_AUTH_TOKEN" -H "Content-Type: application/json"'

    curlJ https://localhost/api/v1.0/devices | jq

This should return a list of two test devices.


#### frontend

Point your browser to http://127.0.0.1:8083.
You should be able to log into the frontend with the user credentials mentioned
[earlier](#set-up-the-auth-container) and click through the tabs.

## Linting

This project uses ESLint and Prettier. Prettier is for formatting rules, while ESLint is for code quality rules.

The extended ESLint rules in use are

- [eslint-config-airbnb](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb) for widely used React standards.
- [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier) turns off ESLint rules that conflict with Prettier.
- [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier) creates ESLint rules from prettier.

The last two rules are for compitability with Prettier and are both set up with the line `"plugin:prettier/recommended"` in _.eslintrc.json_, please note that it needs to be the last entry to properly override previous rules.

To use prettier on file, use

```
npx prettier <file name> --write
```
