#!/bin/sh
# Pick up renewed certificates without a redeploy.
#
# Nginx reads its certificates at startup and on reload, never in between, so a
# certificate certbot renews in the shared volume would otherwise not take
# effect until something restarted the container — and renewal happens around
# day 60 of 90, long after anyone is watching for it.
#
# This has to live in the image rather than as a `command:` override in
# docker-compose.yml: the image's entrypoint only runs /docker-entrypoint.d/
# when its first argument is exactly "nginx", so overriding the command with a
# shell loop silently skips the whole configuration phase — the certificate
# bootstrap and the envsubst templating included — and boots the stock config.
#
# Backgrounded so the entrypoint can continue; the subshell survives the
# entrypoint's exec into Nginx.
set -e

(
    while :; do
        sleep 6h
        nginx -s reload 2>/dev/null || true
    done
) &
