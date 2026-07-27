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
RUN addgroup -S dalventa && adduser -S -G dalventa dalventa
COPY --from=builder --chown=dalventa:dalventa /build/target/*.jar app.jar
USER dalventa
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
