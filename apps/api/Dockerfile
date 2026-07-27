FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
RUN apk add --no-cache dos2unix
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN dos2unix mvnw && chmod +x mvnw
COPY src ./src
RUN ./mvnw package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Run the service as an unprivileged user so a remote code execution does not start as root.
# LocalStorageService creates app.storage.local.dir (default ./uploads) at startup, so that
# directory has to exist and be writable by that user.
# su-exec lets the entrypoint drop privileges when the platform starts the container as root
# to make a mounted volume writable.
RUN apk add --no-cache su-exec \
    && addgroup -S dalventa && adduser -S -G dalventa dalventa \
    && mkdir -p /app/uploads \
    && chown -R dalventa:dalventa /app
COPY --from=builder --chown=dalventa:dalventa /build/target/*.jar app.jar
COPY --chown=dalventa:dalventa docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
USER dalventa
EXPOSE 8080
ENTRYPOINT ["/app/docker-entrypoint.sh"]
