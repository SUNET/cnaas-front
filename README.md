# cnaas-front

## simple standalone dev setup

1. download node
2. download npm
3. navigate to the cnaas-front folder
4. run `npm i` to install all the dependencies
5. run: `npm start` to bundle the js files
6. navigate to `http://localhost:1234` in browser

## Full interactive dev setup with docker compose

This guide will show you how to set up cnaas-nms on your local machine for development. The components will run in Docker containers.

The cnaas-nms frontend will also run inside a Docker container and update interactively with every code change.

### Clone the repositories

Clone the source code for frontend and API. Both should be in the same parent directory.

```bash
git clone https://github.com/SUNET/cnaas-front.git cnaas-front
git clone https://github.com/SUNET/cnaas-nms.git cnaas-nms
```

### Setup and run docker compose

Navigate to `cnaas-front/docker/`.

```bash
cd cnaas-front/docker
```

Build and run with

```bash
docker compose --env-file <your .env file> up -d
```

### Set up the auth container

A script will set up the auth container for you.
This script will create a certificate to verify JWTokens issued by the auth server.
It will also create a user named "cnaas" with password "cnaascnaascnaas".

```bash
docker cp docker/front-dev/setup_auth.sh cnaas-front_auth_1:/opt/auth-server-poc/
docker exec -t cnaas-front_auth_1 /bin/chmod u+x /opt/auth-server-poc/setup_auth.sh
docker exec -t cnaas-front_auth_1 /opt/auth-server-poc/setup_auth.sh
```

### Copy the key for JWT authentication

The public key file is used to verify JWTokens between the auth server and the API.
`public.pem` has to be copied from the auth container to the API container:

```bash
docker cp cnaas-front_auth_1:/opt/auth-server-poc/cert/public.pem .
docker cp public.pem cnaas-front_api_1:/opt/cnaas/jwtcert/public.pem
rm public.pem
docker exec -u root -t cnaas-front_api_1 /bin/chown root:www-data /opt/cnaas/jwtcert/public.pem
```

Then, restart the API application.

```bash
docker exec -t cnaas-front_api_1 /usr/bin/killall uwsgi
```

Alternatively, you can restart the whole API container.

```bash
docker compose restart api
```

### Add some devices to the database

```bash
docker exec -i cnaas-front_postgres_1 /usr/bin/psql -U cnaas cnaas < docker/front-dev/cnaas.pgdump
```

Some errors and warnings will appear. You can ignore those.

### Check it's all working

On the host system (that's your computer), you can now run the following commands to ensure that everything is working: auth, API and frontend.

#### Auth

```bash
curl -ks https://localhost:2443/api/v1.0/auth -X POST -u cnaas -p
```

This should return an access token if you enter [the password](#set-up-the-auth-container)
correctly.
It should look something like this:

```
{"access_token": "exceedingly.ridiculouslyrandomlylookinglongstring"}
```

This token can be used to authenticate with the cnaas-nms REST API, instead of username/password.

Next, create a `.env` file and fill in the token (whatever was returned as the
exceedingly.ridiculouslyrandomlylookinglongstring without the JSON wrapper) as `JWT_AUTH_TOKEN`.

```bash
echo 'JWT_AUTH_TOKEN="exceedingly.ridiculouslyrandomlylookinglongstring"' > .env
```

#### API

Next, load the token into the `JWT_AUTH_TOKEN` environment variable with `source` and define an
alias command that allows you to authenticate with the cnaas-nms REST API using this token.
(The alias is defined for the current shell session only. You can add the alias line to your
`.bashrc` to make it permanent.)

```bash
source .env
alias curlJ='curl -k -s -H "Authorization: Bearer $JWT_AUTH_TOKEN" -H "Content-Type: application/json"'

curlJ https://localhost/api/v1.0/devices | jq
```

This should return a list of two test devices.

#### Frontend

Point your browser to `http://127.0.0.1:8083`.
You should be able to log into the frontend with the user credentials mentioned
[earlier](#set-up-the-auth-container) and click through the tabs.

## Docker

### Build

Be at root of the repo

```bash
docker build -f docker/front/Dockerfile -t cnaas-front .
```

### Environment variables

Check [docker/compose.yaml](docker/compose.yaml)

#### Must have variables:

- CNAAS_API_URL
- SETTINGS_WEB_URL
- TEMPLATES_WEB_URL

#### Optional variables:

- ARISTA_DETECT_ARCH
- CNAAS_FIRMWARE_REPO_METADATA_URL
- CNAAS_FIRMWARE_REPO_URL
- CNAAS_FIRMWARE_URL
- CNAAS_FRONT_URL
- GRAPHITE_URL
- GNMI_PROXY_URL
- MONITORING_WEB_URL
- NETBOX_API_TOKEN
- NETBOX_API_URL
- NETBOX_TENANT_ID
- OIDC_ENABLED
  When OIDC_ENABLED is true CNAAS_AUTH_URL also needs to be set.

### Run

```bash
docker run -p 4443:4443 --name cnaas-front --env-file .env-docker --rm -it cnaas-front
```

## Linting

This project uses ESLint (v9+ flat config) and Prettier. Prettier handles formatting rules, while ESLint handles code quality rules.

The ESLint configuration is in `eslint.config.mjs` and includes:

- [@eslint/js](https://www.npmjs.com/package/@eslint/js) for core recommended rules.
- [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and [eslint-plugin-react-hooks](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks) for React-specific rules.
- [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) for import/export linting.
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) for accessibility rules.
- [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier) integrates Prettier as an ESLint rule, and must be the last config to properly override previous rules.

To lint the project:

```bash
npm run lint
```

To auto-fix lint and formatting issues:

```bash
npm run lint:fix
```

To format a single file with Prettier:

```bash
npx prettier <file name> --write
```
