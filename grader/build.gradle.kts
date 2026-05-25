plugins {
    application
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "com.ftchub"
version = "1.0.0"

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

dependencies {
    // Lightweight HTTP server — chosen for tiny footprint and zero framework overhead.
    implementation("io.javalin:javalin:5.6.4")
    implementation("ch.qos.logback:logback-classic:1.5.6")

    // JSON serialization for request/response bodies.
    implementation("com.fasterxml.jackson.core:jackson-databind:2.17.2")
    implementation("com.fasterxml.jackson.module:jackson-module-parameter-names:2.17.2")

    // Real FTC SDK jars are dropped into libs/ at deploy time and picked up
    // here. The grader compiles against source-only stubs in src/main/resources/ftc-stubs
    // when libs/ is empty.
    implementation(fileTree("libs") { include("*.jar") })

    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

application {
    mainClass.set("com.ftchub.grader.GraderServer")
}

tasks.withType<JavaCompile>().configureEach {
    // Preserve parameter names in bytecode so Jackson can deserialize records
    // by parameter name (records embed the Record attribute, but -parameters
    // is required for non-record constructors and methods).
    options.compilerArgs.add("-parameters")
}

tasks.test {
    useJUnitPlatform()
}

tasks.shadowJar {
    archiveBaseName.set("ftc-grader")
    archiveClassifier.set("")
    archiveVersion.set("")
    mergeServiceFiles()
}

tasks.jar {
    enabled = false
    dependsOn(tasks.shadowJar)
}
