import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = { title: "Java Basics – FTC Programming Hub" };

export default function JavaBasicsPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/java-basics" },
        { label: "Java Basics" },
      ]}
      title="Java Basics"
      description="A beginner-friendly introduction to Java for FTC programmers. Covers variables, data types, control flow, methods, classes, and inheritance — everything you need before writing your first OpMode."
      badge="Beginner"
      badgeColor="blue"
      readingTime="20 min"
      sections={[
        {
          id: "why-java",
          title: "Why Java for FTC?",
          content: (
            <Prose>
              <p>
                FTC robots are programmed in <strong>Java</strong> using the
                official FTC SDK. Java is an object-oriented language — your
                robot, its motors, and its sensors are all represented as{" "}
                <em>objects</em> with properties and behaviors. Understanding
                the basics of Java will make reading and writing OpModes much
                easier.
              </p>
              <InfoGrid
                items={[
                  { label: "Language", value: "Java 8", sub: "Official FTC SDK language" },
                  { label: "IDE", value: "Android Studio", sub: "Ladybug 2024.2+" },
                  { label: "Style", value: "Object-Oriented", sub: "Classes, methods, inheritance" },
                  { label: "Prior knowledge", value: "None needed", sub: "Start here!" },
                ]}
              />
              <NoteBox type="info">
                If you have already programmed in Python or another language,
                many concepts will feel familiar — just with different syntax.
                Java requires <strong>semicolons</strong> at the end of
                statements and <strong>curly braces</strong> to define blocks.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "variables",
          title: "Variables & Data Types",
          content: (
            <Prose>
              <p>
                A <strong>variable</strong> is a named storage location in
                memory. Every variable in Java has a <strong>type</strong>{" "}
                that determines what kind of data it can hold.
              </p>
              <SpecTable
                rows={[
                  { label: "int", value: "Whole numbers", note: "int speed = 50;" },
                  { label: "double", value: "Decimal numbers", note: "double power = 0.75;" },
                  { label: "boolean", value: "true or false", note: "boolean isRunning = true;" },
                  { label: "String", value: "Text", note: "String name = \"MyRobot\";" },
                  { label: "char", value: "Single character", note: "char letter = 'A';" },
                  { label: "float", value: "Decimal (less precise)", note: "float angle = 90.0f;" },
                  { label: "long", value: "Very large whole numbers", note: "long ticks = 100000L;" },
                ]}
              />
              <CodeBlock
                filename="Variables.java"
                code={`// ── Declaring and assigning variables ────────────────────────────────────

int    motorPower  = 100;        // whole number
double servoPos    = 0.5;        // decimal number (most common in FTC)
boolean clawOpen   = false;      // true or false
String  motorName  = "leftFront"; // text — always use double quotes

// ── Constants: use 'final' so the value cannot be changed later ───────────
final double MAX_SPEED   = 1.0;
final int    TICKS_PER_REV = 537;

// ── Java is strongly typed — you cannot mix types without converting ───────
double result = (double) motorPower / 100.0; // cast int → double

// ── Variable names ────────────────────────────────────────────────────────
// Use camelCase for variables:  motorSpeed, isClawOpen, armPosition
// Use UPPER_SNAKE_CASE for constants: MAX_SPEED, TICKS_PER_REV`}
              />
              <NoteBox type="tip">
                In FTC you will use <code>double</code> for almost all motor
                powers and servo positions (they range from <code>-1.0</code> to{" "}
                <code>1.0</code> or <code>0.0</code> to <code>1.0</code>). Use{" "}
                <code>int</code> for encoder tick counts and loop counters.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "operators",
          title: "Operators & Math",
          content: (
            <Prose>
              <p>
                Java uses standard arithmetic operators. The most important
                ones for FTC are shown below:
              </p>
              <SpecTable
                rows={[
                  { label: "+ - * /", value: "Add, subtract, multiply, divide" },
                  { label: "%", value: "Modulo — remainder after division", note: "7 % 3 == 1" },
                  { label: "==", value: "Equal to (comparison, not assignment)" },
                  { label: "!= < > <= >=", value: "Not equal, less than, greater than, etc." },
                  { label: "&&", value: "Logical AND — both sides must be true" },
                  { label: "||", value: "Logical OR — at least one side must be true" },
                  { label: "!", value: "Logical NOT — flips true/false" },
                  { label: "++  --", value: "Increment / decrement by 1", note: "count++" },
                  { label: "+=  -=  *=", value: "Shorthand: x += 5 means x = x + 5" },
                ]}
              />
              <CodeBlock
                filename="Operators.java"
                code={`int a = 10;
int b = 3;

int sum        = a + b;   // 13
int difference = a - b;   // 7
int product    = a * b;   // 30
int quotient   = a / b;   // 3  (integer division — decimal is dropped!)
int remainder  = a % b;   // 1

double exact   = (double) a / b; // 3.333... — cast to double first!

// ── Comparison operators return boolean ──────────────────────────────────
boolean isEqual   = (a == b);   // false
boolean isGreater = (a > b);    // true

// ── Logical operators ─────────────────────────────────────────────────────
boolean both = (a > 0) && (b > 0); // true — both positive
boolean either = (a > 50) || (b < 10); // true — b < 10 is true

// ── Common FTC pattern: clamp a value between 0.0 and 1.0 ────────────────
double power = 1.5;
power = Math.min(1.0, Math.max(-1.0, power)); // clamp to [-1, 1]`}
              />
            </Prose>
          ),
        },
        {
          id: "control-flow",
          title: "Control Flow (if / else / loops)",
          content: (
            <Prose>
              <p>
                Control flow statements let you make decisions and repeat code
                based on conditions.
              </p>
              <h3>if / else if / else</h3>
              <CodeBlock
                filename="ControlFlow.java"
                code={`double power = gamepad1.left_stick_y;

if (power > 0.5) {
    // runs only if power is above 0.5
    telemetry.addData("Speed", "Fast");

} else if (power > 0.1) {
    // runs if power is between 0.1 and 0.5
    telemetry.addData("Speed", "Slow");

} else {
    // runs if none of the above conditions were true
    telemetry.addData("Speed", "Stopped");
}

// ── Single-condition shorthand (ternary operator) ──────────────────────────
String label = (power > 0) ? "Forward" : "Backward";`}
              />
              <h3>while loop</h3>
              <p>
                Runs a block of code <em>repeatedly</em> as long as a
                condition is true. The main FTC loop uses this pattern:
              </p>
              <CodeBlock
                filename="WhileLoop.java"
                code={`// Runs every iteration until the driver presses Stop
while (opModeIsActive()) {
    double leftPower  = -gamepad1.left_stick_y;
    double rightPower = -gamepad1.right_stick_y;

    leftMotor.setPower(leftPower);
    rightMotor.setPower(rightPower);

    telemetry.update();
}

// ── Counting loop: repeat exactly 5 times ────────────────────────────────
int count = 0;
while (count < 5) {
    telemetry.addLine("Loop #" + count);
    count++; // count = count + 1
}`}
              />
              <h3>for loop</h3>
              <p>
                A <code>for</code> loop is shorthand for a counting{" "}
                <code>while</code> loop. It puts the initializer, condition,
                and increment all on one line:
              </p>
              <CodeBlock
                filename="ForLoop.java"
                code={`// for (initializer; condition; increment)
for (int i = 0; i < 5; i++) {
    telemetry.addLine("Iteration: " + i);
}

// ── Loop over an array ────────────────────────────────────────────────────
double[] powers = { 0.2, 0.5, 0.8, 1.0 };
for (double p : powers) {      // "enhanced for loop" — reads as "for each p in powers"
    motor.setPower(p);
    sleep(500);
}`}
              />
              <NoteBox type="warning">
                Be careful with <code>while (true)</code> loops inside an
                OpMode — always include a check like{" "}
                <code>opModeIsActive()</code> so the loop can be stopped when
                the driver presses Stop. An infinite loop with no exit
                condition will freeze the robot.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "arrays-lists",
          title: "Arrays & ArrayLists",
          content: (
            <Prose>
              <p>
                An <strong>array</strong> stores multiple values of the same
                type in a fixed-size list. An <strong>ArrayList</strong> is a
                resizable version of an array.
              </p>
              <CodeBlock
                filename="Arrays.java"
                code={`// ── Array: fixed size, declared with type[] ──────────────────────────────
double[] motorPowers = new double[4]; // array of 4 doubles, all 0.0 by default
motorPowers[0] = 0.5;
motorPowers[1] = 0.8;
motorPowers[2] = 0.5;
motorPowers[3] = 0.8;

// Declare and fill at the same time:
String[] motorNames = { "leftFront", "leftBack", "rightBack", "rightFront" };

// Access by index (0-based):
String firstName = motorNames[0]; // "leftFront"
int length = motorNames.length;   // 4

// ── ArrayList: resizable, part of java.util ───────────────────────────────
import java.util.ArrayList;

ArrayList<String> errors = new ArrayList<>();
errors.add("Motor not found");
errors.add("IMU timeout");

int size = errors.size();           // 2
String first = errors.get(0);      // "Motor not found"
errors.remove(0);                  // removes first element
boolean hasErrors = !errors.isEmpty();`}
              />
              <NoteBox type="tip">
                In FTC you&apos;ll mostly use arrays for fixed hardware
                configurations (e.g. a list of four motor names) and{" "}
                <code>ArrayList</code> when you need to build a list
                dynamically at runtime.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "methods",
          title: "Methods",
          content: (
            <Prose>
              <p>
                A <strong>method</strong> is a named block of reusable code.
                Instead of writing the same logic multiple times, you write
                it once as a method and call it wherever you need it.
              </p>
              <CodeBlock
                filename="Methods.java"
                code={`// ── Method syntax ─────────────────────────────────────────────────────────
// returnType methodName(parameterType paramName, ...) { body }

// A method that takes no parameters and returns nothing (void)
public void stopAllMotors() {
    leftFront.setPower(0);
    leftBack.setPower(0);
    rightFront.setPower(0);
    rightBack.setPower(0);
}

// A method that takes a parameter
public void setAllMotors(double power) {
    leftFront.setPower(power);
    leftBack.setPower(power);
    rightFront.setPower(power);
    rightBack.setPower(power);
}

// A method that returns a value
public double inchesToTicks(double inches) {
    final double TICKS_PER_REV  = 537.7;
    final double WHEEL_DIAMETER = 4.0; // inches
    double circumference = Math.PI * WHEEL_DIAMETER;
    return (inches / circumference) * TICKS_PER_REV;
}

// A method that returns a boolean
public boolean isTargetReached(int targetTicks) {
    return Math.abs(motor.getCurrentPosition() - targetTicks) < 20;
}

// ── Calling methods ────────────────────────────────────────────────────────
stopAllMotors();                           // void — no return value
setAllMotors(0.8);                         // pass a value in
int ticks = (int) inchesToTicks(24.0);    // use the return value
if (isTargetReached(500)) { stopAllMotors(); }`}
              />
              <NoteBox type="info">
                A method with return type <code>void</code> does not return
                anything. For all other return types, you <strong>must</strong>{" "}
                include a <code>return</code> statement inside the method body,
                or Java will give a compile error.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "classes-objects",
          title: "Classes & Objects",
          content: (
            <Prose>
              <p>
                A <strong>class</strong> is a blueprint that describes the
                properties (fields) and behaviors (methods) of a thing. An{" "}
                <strong>object</strong> is a specific instance created from
                that blueprint.
              </p>
              <CodeBlock
                filename="Claw.java"
                code={`// ── Defining a class ──────────────────────────────────────────────────────
public class Claw {

    // ── Fields (instance variables) — each object has its own copy ────────
    private Servo servo;
    private boolean isOpen;

    // ── Constants ─────────────────────────────────────────────────────────
    private static final double OPEN_POSITION   = 0.8;
    private static final double CLOSED_POSITION = 0.2;

    // ── Constructor — runs when you create a new Claw object ──────────────
    // The constructor name must exactly match the class name
    public Claw(HardwareMap hardwareMap) {
        servo  = hardwareMap.get(Servo.class, "claw_servo");
        isOpen = false;
        servo.setPosition(CLOSED_POSITION);
    }

    // ── Methods — the behaviors of this class ─────────────────────────────
    public void open() {
        servo.setPosition(OPEN_POSITION);
        isOpen = true;
    }

    public void close() {
        servo.setPosition(CLOSED_POSITION);
        isOpen = false;
    }

    public boolean isOpen() {
        return isOpen;
    }

    public void toggle() {
        if (isOpen) {
            close();
        } else {
            open();
        }
    }
}

// ── Creating and using an object ──────────────────────────────────────────
// In your OpMode's init():
Claw claw = new Claw(hardwareMap); // creates a new Claw instance

// Call its methods:
claw.open();
claw.close();
claw.toggle();
boolean open = claw.isOpen();`}
              />
              <SpecTable
                rows={[
                  { label: "class", value: "The blueprint / template" },
                  { label: "object / instance", value: "A specific copy created from the class" },
                  { label: "field", value: "A variable that belongs to the class" },
                  { label: "constructor", value: "Special method that runs on new — sets up the object" },
                  { label: "method", value: "A behavior the object can perform" },
                  { label: "this", value: "Refers to the current object inside the class" },
                ]}
              />
              <NoteBox type="tip">
                In FTC, it&apos;s good practice to create a separate class for
                each subsystem (claw, arm, intake, lift). This keeps your
                OpMode clean — it just calls <code>claw.open()</code> instead
                of directly touching servo positions everywhere.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "access-modifiers",
          title: "Access Modifiers",
          content: (
            <Prose>
              <p>
                Access modifiers control which parts of your code can see
                (access) a field or method.
              </p>
              <SpecTable
                rows={[
                  { label: "public", value: "Any class can access it", note: "Use for methods you call from outside" },
                  { label: "private", value: "Only this class can access it", note: "Use for internal fields" },
                  { label: "protected", value: "This class and subclasses can access it", note: "Used with inheritance" },
                  { label: "(none)", value: "Package-private — same package only", note: "Rarely used in FTC" },
                ]}
              />
              <CodeBlock
                filename="AccessModifiers.java"
                code={`public class Lift {

    // private: only code inside Lift can read/set this
    private DcMotorEx motor;
    private int targetPosition;

    // public: anyone can call this
    public void goToHeight(int ticks) {
        targetPosition = ticks;
        motor.setTargetPosition(ticks);
        motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        motor.setPower(0.8);
    }

    // public getter — lets outside code read the value but not change it
    public int getTargetPosition() {
        return targetPosition;
    }
}`}
              />
              <NoteBox type="info">
                A common pattern is to make <strong>fields private</strong> and
                provide <strong>public methods</strong> to read or change them.
                This is called <em>encapsulation</em> — it protects your data
                from being accidentally changed in unexpected ways.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "inheritance",
          title: "Inheritance",
          content: (
            <Prose>
              <p>
                <strong>Inheritance</strong> lets one class{" "}
                <em>extend</em> another, automatically gaining all of its
                fields and methods. The class being extended is called the{" "}
                <strong>parent</strong> (or superclass); the extending class
                is the <strong>child</strong> (or subclass).
              </p>
              <p>
                You already use inheritance every time you write an OpMode —{" "}
                your class <code>extends LinearOpMode</code>, which gives it
                all the FTC robot lifecycle methods (<code>waitForStart()</code>,{" "}
                <code>opModeIsActive()</code>, <code>hardwareMap</code>, etc.)
                for free.
              </p>
              <CodeBlock
                filename="Inheritance.java"
                code={`// ── Parent class (superclass) ─────────────────────────────────────────────
public class Robot {

    protected DcMotor leftMotor;
    protected DcMotor rightMotor;

    public Robot(HardwareMap hardwareMap) {
        leftMotor  = hardwareMap.get(DcMotor.class, "left_motor");
        rightMotor = hardwareMap.get(DcMotor.class, "right_motor");
    }

    public void drive(double left, double right) {
        leftMotor.setPower(left);
        rightMotor.setPower(right);
    }

    public void stop() {
        drive(0, 0);
    }
}

// ── Child class (subclass) — inherits everything from Robot ──────────────
public class ScoutRobot extends Robot {

    private Claw claw;
    private Lift lift;

    // super(...) calls the parent constructor — required as first line
    public ScoutRobot(HardwareMap hardwareMap) {
        super(hardwareMap); // sets up leftMotor and rightMotor
        claw = new Claw(hardwareMap);
        lift = new Lift(hardwareMap);
    }

    // ── Override an inherited method ──────────────────────────────────────
    @Override
    public void drive(double left, double right) {
        // Add a speed limit on top of the parent behavior
        double maxPower = 0.8;
        super.drive(left * maxPower, right * maxPower);
    }

    // ── New methods unique to ScoutRobot ──────────────────────────────────
    public void score() {
        lift.goToHeight(1500);
        claw.open();
    }
}

// ── Usage in an OpMode ────────────────────────────────────────────────────
ScoutRobot robot = new ScoutRobot(hardwareMap);
robot.drive(0.5, 0.5);   // inherited from Robot (but overridden)
robot.stop();             // inherited from Robot
robot.score();            // only exists on ScoutRobot`}
              />
              <SpecTable
                rows={[
                  { label: "extends", value: "Creates a child class from a parent" },
                  { label: "super()", value: "Calls the parent constructor — must be first line in child constructor" },
                  { label: "super.method()", value: "Calls the parent's version of an overridden method" },
                  { label: "@Override", value: "Annotation — signals you are intentionally replacing a parent method" },
                  { label: "protected", value: "Accessible in the class and all subclasses" },
                ]}
              />
              <NoteBox type="info">
                In FTC, the most important use of inheritance is{" "}
                <code>extends LinearOpMode</code> and{" "}
                <code>extends OpMode</code>. FIRST wrote these parent classes
                so you get all the robot lifecycle hooks — you just fill in
                what your robot specifically does.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "interfaces",
          title: "Interfaces",
          content: (
            <Prose>
              <p>
                An <strong>interface</strong> is like a contract — it defines
                a set of methods that any class implementing it{" "}
                <em>must</em> provide. Unlike inheritance (one parent only),
                a class can implement multiple interfaces.
              </p>
              <CodeBlock
                filename="Interfaces.java"
                code={`// ── Define an interface ──────────────────────────────────────────────────
public interface Subsystem {
    void init(HardwareMap hardwareMap);  // must be implemented
    void update();                       // must be implemented
    void stop();                         // must be implemented
}

// ── Implement the interface ───────────────────────────────────────────────
public class Intake implements Subsystem {

    private DcMotor intakeMotor;

    @Override
    public void init(HardwareMap hardwareMap) {
        intakeMotor = hardwareMap.get(DcMotor.class, "intake");
    }

    @Override
    public void update() {
        if (gamepad1.right_bumper) {
            intakeMotor.setPower(1.0);
        } else if (gamepad1.left_bumper) {
            intakeMotor.setPower(-1.0);
        } else {
            intakeMotor.setPower(0);
        }
    }

    @Override
    public void stop() {
        intakeMotor.setPower(0);
    }
}

// ── Use the interface type as a variable type ─────────────────────────────
// This lets you store any subsystem in the same list
List<Subsystem> subsystems = new ArrayList<>();
subsystems.add(new Intake());
subsystems.add(new Lift());

for (Subsystem s : subsystems) {
    s.update(); // calls the correct update() for each subsystem
}`}
              />
              <NoteBox type="tip">
                You already use interfaces constantly in FTC without
                realizing it. The Road Runner <code>Action</code> interface is
                one example — any class that implements{" "}
                <code>Action</code> and provides a <code>run()</code> method
                can be used anywhere an <code>Action</code> is expected.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "static",
          title: "Static vs Instance",
          content: (
            <Prose>
              <p>
                <strong>Instance</strong> fields and methods belong to a
                specific object — each <code>Claw</code> you create has its
                own servo. <strong>Static</strong> fields and methods belong
                to the <em>class itself</em> — there is only one copy shared
                by everyone.
              </p>
              <CodeBlock
                filename="Static.java"
                code={`public class RobotConstants {

    // static final = a constant shared by the whole program
    // No object needed — access it as RobotConstants.TICKS_PER_REV
    public static final double TICKS_PER_REV  = 537.7;
    public static final double WHEEL_DIAMETER = 4.0;  // inches

    // static method — call it without creating a RobotConstants object
    public static double inchesToTicks(double inches) {
        double circumference = Math.PI * WHEEL_DIAMETER;
        return (inches / circumference) * TICKS_PER_REV;
    }
}

// ── Usage — no 'new' needed for static members ────────────────────────────
double ticks = RobotConstants.inchesToTicks(24.0);
double rev   = RobotConstants.TICKS_PER_REV;`}
              />
              <SpecTable
                rows={[
                  { label: "static field", value: "One value shared across all instances" },
                  { label: "static final field", value: "A named constant — value cannot change" },
                  { label: "static method", value: "Utility function — call without an object" },
                  { label: "instance field", value: "Each object has its own copy" },
                  { label: "instance method", value: "Needs an object to call — uses 'this'" },
                ]}
              />
              <NoteBox type="info">
                Use <code>static final</code> for magic numbers like encoder
                counts, arm positions, or speed limits so they are defined in
                one place and easy to change. Never scatter literal numbers
                like <code>537.7</code> throughout your code.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "putting-it-together",
          title: "Putting It Together — FTC Example",
          content: (
            <Prose>
              <p>
                Here is a minimal but well-structured TeleOp that applies
                everything above: a constants class, a subsystem class, and a
                clean OpMode that just calls the subsystem.
              </p>
              <CodeBlock
                filename="RobotConstants.java"
                code={`public class RobotConstants {
    public static final String LEFT_MOTOR  = "left_motor";
    public static final String RIGHT_MOTOR = "right_motor";
    public static final String CLAW_SERVO  = "claw_servo";

    public static final double CLAW_OPEN   = 0.8;
    public static final double CLAW_CLOSED = 0.2;
    public static final double MAX_POWER   = 0.9;
}`}
              />
              <CodeBlock
                filename="Claw.java"
                code={`public class Claw {
    private final Servo servo;
    private boolean open = false;

    public Claw(HardwareMap hardwareMap) {
        servo = hardwareMap.get(Servo.class, RobotConstants.CLAW_SERVO);
        servo.setPosition(RobotConstants.CLAW_CLOSED);
    }

    public void toggle() {
        open = !open;
        servo.setPosition(open ? RobotConstants.CLAW_OPEN : RobotConstants.CLAW_CLOSED);
    }

    public boolean isOpen() { return open; }
}`}
              />
              <CodeBlock
                filename="DriveOpMode.java"
                code={`@TeleOp(name = "Drive + Claw TeleOp")
public class DriveOpMode extends LinearOpMode {

    @Override
    public void runOpMode() {
        // Set up hardware
        DcMotor leftMotor  = hardwareMap.get(DcMotor.class, RobotConstants.LEFT_MOTOR);
        DcMotor rightMotor = hardwareMap.get(DcMotor.class, RobotConstants.RIGHT_MOTOR);
        Claw claw = new Claw(hardwareMap);

        rightMotor.setDirection(DcMotor.Direction.REVERSE);

        telemetry.addData("Status", "Ready");
        telemetry.update();

        waitForStart();

        boolean prevBumper = false; // used to detect button press (edge detection)

        while (opModeIsActive()) {

            // ── Drive ────────────────────────────────────────────────────────
            double leftPower  = -gamepad1.left_stick_y  * RobotConstants.MAX_POWER;
            double rightPower = -gamepad1.right_stick_y * RobotConstants.MAX_POWER;
            leftMotor.setPower(leftPower);
            rightMotor.setPower(rightPower);

            // ── Claw toggle (detect press, not hold) ─────────────────────────
            boolean currBumper = gamepad1.right_bumper;
            if (currBumper && !prevBumper) {
                claw.toggle();
            }
            prevBumper = currBumper;

            // ── Telemetry ─────────────────────────────────────────────────────
            telemetry.addData("Left Power",  "%.2f", leftPower);
            telemetry.addData("Right Power", "%.2f", rightPower);
            telemetry.addData("Claw",        claw.isOpen() ? "Open" : "Closed");
            telemetry.update();
        }
    }
}`}
              />
              <NoteBox type="tip">
                Notice the <strong>edge detection</strong> pattern for the
                bumper — storing <code>prevBumper</code> and only acting when
                the button <em>just</em> became pressed. This prevents the
                claw from toggling dozens of times per second while the button
                is held down.
              </NoteBox>
            </Prose>
          ),
        },
      ]}
    />
  );
}
