// Google's mirror of Maven Central first (repo.maven.apache.org rate-limits busy networks), then the usual sources.
val centralMirror = "https://maven-central.storage-download.googleapis.com/maven2/"

pluginManagement {
    repositories {
        google()
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        maven(centralMirror)
        mavenCentral()
    }
}
rootProject.name = "ModAlpha"
include(":app")
