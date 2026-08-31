#!/bin/sh
# Break the certificate deadlock on a fresh deployment.
#
# Nginx refuses to start when an ssl_certificate points at a file that does not
# exist. On a new VM no certificate exists yet — and Nginx has to be running to
# serve the ACME challenge that would create one. So the first boot can never
# happen without a placeholder.
#
# Minting a throwaway self-signed pair here lets Nginx start; certbot then
# overwrites these exact paths on first issuance. It doubles as the fallback if
# ACME validation turns out to be impossible from this host: the stack still
# serves HTTPS, just with a certificate browsers warn about.
#
# Runs before 20-envsubst-on-templates.sh, so it reads SERVER_NAME from the
# environment rather than from the rendered config.
set -e

SERVER_NAME="${SERVER_NAME:-localhost}"
live="/etc/letsencrypt/live/$SERVER_NAME"

if [ -s "$live/fullchain.pem" ] && [ -s "$live/privkey.pem" ]; then
    echo "10-ensure-cert: certificate present for $SERVER_NAME"
    exit 0
fi

echo "10-ensure-cert: no certificate for $SERVER_NAME, generating a temporary self-signed one"
mkdir -p "$live"
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "$live/privkey.pem" \
    -out    "$live/fullchain.pem" \
    -subj   "/CN=$SERVER_NAME" 2>/dev/null

echo "10-ensure-cert: temporary certificate written to $live"
