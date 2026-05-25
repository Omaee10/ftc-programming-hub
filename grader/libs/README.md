# grader/libs

Drop real FTC SDK jars here (e.g. `RobotCore-9.x.jar`, `Hardware-9.x.jar`) when
you want the grader to compile against the production SDK instead of the
source stubs under `src/main/resources/ftc-stubs`.

These jars are picked up automatically by Gradle (`fileTree("libs")`) and added
to the classpath of every student compile.

Jars in this directory are **not** committed to git by default — fetch them at
deploy time, or vendor them in a private branch.
