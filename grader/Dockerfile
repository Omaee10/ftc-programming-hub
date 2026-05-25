# ── Stage 1: build the shadow jar ────────────────────────────────────────────
# Use non-Alpine images — eclipse-temurin:*-alpine has no arm64 manifest on Apple Silicon.
FROM gradle:8.10-jdk17 AS build
WORKDIR /home/gradle/src
COPY --chown=gradle:gradle settings.gradle.kts build.gradle.kts gradle.properties ./
COPY --chown=gradle:gradle src ./src
# libs/ is optional — real FTC jars are dropped here at deploy time
COPY --chown=gradle:gradle libs ./libs
RUN gradle --no-daemon shadowJar

# ── Stage 2: runtime (full JDK — javax.tools.JavaCompiler compiles student code) ──
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app

COPY --from=build /home/gradle/src/build/libs/ftc-grader.jar /app/ftc-grader.jar

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system grader \
    && useradd --system --gid grader grader \
    && chown -R grader:grader /app

USER grader

# Render injects PORT at runtime — do not hardcode it here.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70.0 -XX:+UseSerialGC"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-8080}/healthz" || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/ftc-grader.jar"]
