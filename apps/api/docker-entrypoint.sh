#!/bin/sh
# Prepares the upload directory and then runs the API as an unprivileged user.
#
# Railway mounts volumes as root and tells you to set RAILWAY_RUN_UID=0 so the container can
# write to them. Doing only that would run the JVM as root for the life of the service. Instead
# the container may start as root, fix ownership of the mount, and immediately drop privileges,
# so the Java process itself is never privileged.
#
# When the container already starts unprivileged (plain docker run, docker compose), there is
# nothing to fix and nothing to drop: the image already owns the directory.
set -e

UPLOAD_DIR="${APP_STORAGE_LOCAL_DIR:-/app/uploads}"

if [ "$(id -u)" = "0" ]; then
    mkdir -p "$UPLOAD_DIR"
    chown -R dalventa:dalventa "$UPLOAD_DIR"
    exec su-exec dalventa:dalventa java ${JAVA_OPTS} -jar /app/app.jar "$@"
fi

mkdir -p "$UPLOAD_DIR"
exec java ${JAVA_OPTS} -jar /app/app.jar "$@"
