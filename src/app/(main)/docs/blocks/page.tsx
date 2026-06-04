import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, SpecTable, Prose } from "@/components/DocPrimitives";
import {
  StatementBlock,
  ReporterBlock,
  BooleanBlock,
  ContainerBlock,
  BlockStack,
  Dropdown,
  TextChip,
  NumInput,
  BoolInput,
} from "@/components/BlockVisual";

export const metadata: Metadata = {
  title: "FTC Blocks Reference – FTC Programming Hub",
};

// Shared category colours (must match CATEGORY_COLOUR in ftcBlocks.ts)
const C = {
  Lifecycle: "#a55b80",
  Hardware:  "#5b67a5",
  Motors:    "#5ba55b",
  Servos:    "#a5825b",
  Gamepad:   "#a5a55b",
  Telemetry: "#5ba5a5",
  Logic:     "#5b80a5",
  Math:      "#a55b5b",
  Variables: "#9b5ba5",
  Sensors:   "#5b80a5",
};

export default function BlocksReferencePage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/java-basics" },
        { label: "FTC Blocks Reference" },
      ]}
      title="FTC Blocks Reference"
      description="Every block available in the FTC Blocks visual editor — with visual previews, descriptions, field explanations, and Java equivalents."
      badge="Beginner"
      badgeColor="blue"
      readingTime="12 min"
      sections={[

        // ── MOTORS ──────────────────────────────────────────────────────────
        {
          id: "motors",
          title: "Motors",
          content: (
            <Prose>
              <p>
                Motor blocks control DC motors connected to the REV Control Hub.
                Every motor must first be retrieved from hardware during{" "}
                <strong>initialization</strong> (before{" "}
                <code>waitForStart</code>), then driven inside the{" "}
                <strong>while OpMode is active</strong> loop.
              </p>
              <NoteBox type="tip">
                Always call <strong>reset encoder</strong> before a{" "}
                <strong>run to position</strong> move. Without a reset the
                target is relative to wherever the encoder happened to be,
                not the current position.
              </NoteBox>

              {/* set power */}
              <div className="mt-6 space-y-3">
                <StatementBlock colour={C.Motors}>
                  set power of <TextChip>motor</TextChip> to <NumInput />
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Sets how fast and in which direction a motor spins. Pass any
                  value from <code>−1.0</code> (full reverse) to{" "}
                  <code>1.0</code> (full forward). <code>0.0</code> stops the
                  motor (subject to zero-power behavior).
                </p>
                <SpecTable
                  rows={[
                    { label: "motor", value: "device name", note: "Name from Get Hardware block" },
                    { label: "value", value: "−1.0 … 1.0", note: "Outside range is silently clamped" },
                  ]}
                />
                <CodeBlock filename="setPower example" code={`motor.setPower(0.8);   // 80% forward
motor.setPower(-0.5);  // 50% reverse
motor.setPower(0.0);   // stop`} />
              </div>

              {/* set direction */}
              <div className="mt-8 space-y-3">
                <StatementBlock colour={C.Motors}>
                  set direction of <TextChip>motor</TextChip> to <Dropdown>FORWARD</Dropdown>
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Flips which way positive power moves the motor. Use{" "}
                  <code>REVERSE</code> when two motors face opposite directions
                  on a drive train so both move the robot forward with the same
                  positive power value. Call this once in <strong>init</strong>.
                </p>
                <SpecTable
                  rows={[
                    { label: "FORWARD", value: "default", note: "Positive power = forward rotation" },
                    { label: "REVERSE", value: "flipped", note: "Positive power = backward rotation" },
                  ]}
                />
                <CodeBlock filename="setDirection example" code={`leftMotor.setDirection(DcMotorSimple.Direction.FORWARD);
rightMotor.setDirection(DcMotorSimple.Direction.REVERSE);`} />
              </div>

              {/* set zero-power behavior */}
              <div className="mt-8 space-y-3">
                <StatementBlock colour={C.Motors}>
                  set zero-power behavior of <TextChip>motor</TextChip> to <Dropdown>BRAKE</Dropdown>
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Controls what the motor does when power is set to 0.{" "}
                  <code>BRAKE</code> actively holds the shaft in place;{" "}
                  <code>FLOAT</code> lets it spin freely to a stop. Call
                  this once in <strong>init</strong>.
                </p>
                <SpecTable
                  rows={[
                    { label: "BRAKE", value: "actively holds shaft", note: "Best for arms and lifts — prevents drooping" },
                    { label: "FLOAT", value: "free-spin to stop", note: "Best for drive wheels — smoother deceleration" },
                  ]}
                />
              </div>

              {/* reset encoder */}
              <div className="mt-8 space-y-3">
                <StatementBlock colour={C.Motors}>
                  reset encoder of <TextChip>motor</TextChip>
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Zeroes the encoder tick counter and switches the motor to{" "}
                  <code>RUN_USING_ENCODER</code> mode. Always call this before
                  a <strong>run to position</strong> move so the target is
                  measured from the current physical position.
                </p>
                <CodeBlock filename="reset encoder example" code={`// Reset, then drive 1000 ticks forward
motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
motor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);`} />
              </div>

              {/* run to position */}
              <div className="mt-8 space-y-3">
                <StatementBlock colour={C.Motors}>
                  run <TextChip>motor</TextChip> to position <NumInput /> at power <NumInput />
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  An all-in-one block that sets the target position, switches to{" "}
                  <code>RUN_TO_POSITION</code> mode, and applies power — the
                  three SDK calls in one step. The motor drives until it reaches
                  the target. Use <strong>while motor is busy</strong> afterward
                  to wait for it to arrive.
                </p>
                <NoteBox type="warning">
                  Always call <strong>reset encoder</strong> before this block.
                  The target is an absolute encoder tick count — without a reset,
                  the motor will travel the wrong distance.
                </NoteBox>
                <CodeBlock filename="run to position example" code={`// Reset → run to position → wait → stop
motor.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
motor.setTargetPosition(1440); // one full revolution (typical goBILDA motor)
motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
motor.setPower(0.6);
while (motor.isBusy() && opModeIsActive()) { idle(); }
motor.setPower(0);`} />
              </div>

              {/* is busy */}
              <div className="mt-8 space-y-3">
                <BooleanBlock colour={C.Motors}>
                  <TextChip>motor</TextChip> is busy
                </BooleanBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Returns <code>true</code> while the motor is still traveling
                  toward its <code>RUN_TO_POSITION</code> target. Plug this into
                  the condition slot of a <strong>while condition and OpMode active</strong>{" "}
                  block to wait until the motor arrives, then set power to 0.
                </p>
                <NoteBox type="tip">
                  Always pair <code>isBusy()</code> with{" "}
                  <code>opModeIsActive()</code>. The{" "}
                  <strong>while condition and OpMode active</strong> block does
                  this automatically — never use a plain{" "}
                  <strong>while</strong> loop with only <code>isBusy()</code>.
                </NoteBox>
                <CodeBlock filename="isBusy usage" code={`while (motor.isBusy() && opModeIsActive()) {
    idle();
}
motor.setPower(0); // always stop after arriving`} />
              </div>

              {/* position of */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Motors}>
                  position of <TextChip>motor</TextChip>
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Returns the current encoder tick count as a number. Use this
                  to read how far the motor has traveled, track an arm position,
                  or build a PID controller. The value is cumulative until you
                  reset the encoder.
                </p>
                <CodeBlock filename="getCurrentPosition example" code={`int ticks = motor.getCurrentPosition();
telemetry.addData("Arm ticks", ticks);`} />
              </div>

              {/* set velocity */}
              <div className="mt-8 space-y-3">
                <StatementBlock colour={C.Motors}>
                  set velocity of <TextChip>motor</TextChip> to <NumInput />
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Sets the motor speed in encoder ticks per second using the
                  built-in PID velocity controller. Requires{" "}
                  <code>DcMotorEx</code> (use <strong>DcMotorEx</strong> in the
                  Get Hardware block) and <code>RUN_USING_ENCODER</code> mode.
                  Use this for consistent flywheel or shooter speeds.
                </p>
                <CodeBlock filename="setVelocity example" code={`// Requires DcMotorEx + RUN_USING_ENCODER
DcMotorEx shooter = hardwareMap.get(DcMotorEx.class, "shooter");
shooter.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
shooter.setVelocity(1500); // 1500 ticks/sec`} />
              </div>

              {/* Example composition */}
              <h3 className="mt-10 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Example — TeleOp drive + one-shot encoder move
              </h3>
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-5 overflow-x-auto">
                <BlockStack>
                  <StatementBlock colour={C.Lifecycle} hasPrevious={false}>
                    ▶ runOpMode
                  </StatementBlock>
                </BlockStack>
                <div className="ml-6 mt-1 space-y-1">
                  <BlockStack>
                    <StatementBlock colour={C.Hardware}>
                      get <Dropdown>DcMotorEx</Dropdown> from config <TextChip>left_motor</TextChip> into <TextChip>left</TextChip>
                    </StatementBlock>
                    <StatementBlock colour={C.Hardware}>
                      get <Dropdown>DcMotorEx</Dropdown> from config <TextChip>right_motor</TextChip> into <TextChip>right</TextChip>
                    </StatementBlock>
                    <StatementBlock colour={C.Motors}>
                      set direction of <TextChip>right</TextChip> to <Dropdown>REVERSE</Dropdown>
                    </StatementBlock>
                    <StatementBlock colour={C.Motors}>
                      set zero-power behavior of <TextChip>left</TextChip> to <Dropdown>BRAKE</Dropdown>
                    </StatementBlock>
                    <StatementBlock colour={C.Motors}>
                      set zero-power behavior of <TextChip>right</TextChip> to <Dropdown>BRAKE</Dropdown>
                    </StatementBlock>
                    <StatementBlock colour={C.Lifecycle}>
                      waitForStart
                    </StatementBlock>
                  </BlockStack>
                  <ContainerBlock colour={C.Lifecycle} header={<>while OpMode is active</>}>
                    <BlockStack>
                      <StatementBlock colour={C.Motors}>
                        set power of <TextChip>left</TextChip> to <NumInput><ReporterBlock colour={C.Gamepad}>gamepad 1 left stick Y</ReporterBlock></NumInput>
                      </StatementBlock>
                      <StatementBlock colour={C.Motors}>
                        set power of <TextChip>right</TextChip> to <NumInput><ReporterBlock colour={C.Gamepad}>gamepad 1 right stick Y</ReporterBlock></NumInput>
                      </StatementBlock>
                      <StatementBlock colour={C.Telemetry}>
                        telemetry update
                      </StatementBlock>
                    </BlockStack>
                  </ContainerBlock>
                </div>
              </div>
            </Prose>
          ),
        },

        // ── SERVOS ──────────────────────────────────────────────────────────
        {
          id: "servos",
          title: "Servos",
          content: (
            <Prose>
              <p>
                FTC uses two types of servo: a standard <strong>Servo</strong>{" "}
                that moves to a fixed angle, and a{" "}
                <strong>CRServo</strong> (continuous rotation servo) that spins
                like a slow motor. They use different blocks and are not
                interchangeable.
              </p>
              <SpecTable
                rows={[
                  { label: "Servo", value: "setPosition(0.0 – 1.0)", note: "Moves to a fixed angle. 0 = one end, 1 = other end, 0.5 = center." },
                  { label: "CRServo", value: "setPower(−1.0 – 1.0)", note: "Spins continuously. Same block as a motor — use Set Power." },
                ]}
              />

              {/* set position */}
              <div className="mt-6 space-y-3">
                <StatementBlock colour={C.Servos}>
                  set position of <TextChip>servo</TextChip> to <NumInput />
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Moves a standard servo to the given position. The value is a
                  fraction of the servo&apos;s full range: <code>0.0</code> is
                  one physical end, <code>1.0</code> is the other, and{" "}
                  <code>0.5</code> is the center. The servo holds that position
                  until you command a new one.
                </p>
                <NoteBox type="warning">
                  <code>setPosition()</code> sends the command instantly — it
                  does <strong>not</strong> wait for the servo to physically
                  arrive. Add a <strong>sleep</strong> block after it if the
                  next action depends on the servo being in place.
                </NoteBox>
                <SpecTable
                  rows={[
                    { label: "0.0", value: "fully retracted / closed", note: "One physical end-stop" },
                    { label: "0.5", value: "center / neutral", note: "Midpoint of travel" },
                    { label: "1.0", value: "fully extended / open", note: "Other physical end-stop" },
                  ]}
                />
                <CodeBlock filename="setPosition example" code={`// Claw servo — 0.1 = closed, 0.9 = open
clawServo.setPosition(0.1); // close
sleep(500);                 // wait 0.5 s for servo to arrive
// ... lift arm ...
clawServo.setPosition(0.9); // open`} />
              </div>

              {/* CRServo via set power */}
              <div className="mt-8 space-y-3">
                <StatementBlock colour={C.Motors}>
                  set power of <TextChip>intake</TextChip> to <NumInput />
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Continuous rotation servos use the same{" "}
                  <strong>Set Power</strong> block as DC motors. Pass{" "}
                  <code>1.0</code> for full forward, <code>−1.0</code> for full
                  reverse, and <code>0.0</code> to stop. Remember to declare
                  the hardware type as <strong>CRServo</strong> in the Get
                  Hardware block.
                </p>
                <CodeBlock filename="CRServo example" code={`// intake CRServo
if (gamepad1.right_bumper) {
    intake.setPower(1.0);   // spin in
} else if (gamepad1.left_bumper) {
    intake.setPower(-1.0);  // spin out
} else {
    intake.setPower(0.0);   // stop
}`} />
              </div>

              {/* Example composition */}
              <h3 className="mt-10 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Example — Claw preset positions with button toggle
              </h3>
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-5 overflow-x-auto">
                <ContainerBlock colour={C.Lifecycle} header={<>while OpMode is active</>}>
                  <BlockStack>
                    <ContainerBlock colour={C.Logic} header={<>if <BoolInput><BooleanBlock colour={C.Gamepad}>gamepad 1 <Dropdown>A</Dropdown> pressed</BooleanBlock></BoolInput> do</>} hasNext={false}>
                      <StatementBlock colour={C.Servos} hasNext={false}>
                        set position of <TextChip>claw</TextChip> to <NumInput>0.1</NumInput>
                      </StatementBlock>
                    </ContainerBlock>
                    <ContainerBlock colour={C.Logic} header={<>if <BoolInput><BooleanBlock colour={C.Gamepad}>gamepad 1 <Dropdown>B</Dropdown> pressed</BooleanBlock></BoolInput> do</>} hasNext={false}>
                      <StatementBlock colour={C.Servos} hasNext={false}>
                        set position of <TextChip>claw</TextChip> to <NumInput>0.9</NumInput>
                      </StatementBlock>
                    </ContainerBlock>
                  </BlockStack>
                </ContainerBlock>
              </div>
            </Prose>
          ),
        },

        // ── GAMEPAD ─────────────────────────────────────────────────────────
        {
          id: "gamepad",
          title: "Gamepad",
          content: (
            <Prose>
              <p>
                Gamepad blocks read live input from the two driver controllers.{" "}
                <strong>Gamepad 1</strong> is the primary driver;{" "}
                <strong>Gamepad 2</strong> is the operator. All gamepad reads
                must happen inside the <strong>while OpMode is active</strong>{" "}
                loop to update every frame.
              </p>
              <NoteBox type="warning">
                FTC gamepad Y-axes are <strong>inverted</strong> — pushing the
                stick fully forward returns <code>−1.0</code>, not{" "}
                <code>1.0</code>. Wrap axis blocks in a <strong>negate</strong>{" "}
                Math block so forward stick = positive motor power.
              </NoteBox>

              {/* axis */}
              <div className="mt-6 space-y-3">
                <ReporterBlock colour={C.Gamepad}>
                  <Dropdown>gamepad 1</Dropdown> <Dropdown>left stick Y</Dropdown>
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Returns the joystick axis value as a number from{" "}
                  <code>−1.0</code> to <code>1.0</code>. Choose which
                  controller (1 or 2) and which axis from the two dropdowns.
                </p>
                <SpecTable
                  rows={[
                    { label: "left stick Y", value: "up/down on left stick", note: "Inverted — push up = −1.0" },
                    { label: "left stick X", value: "left/right on left stick", note: "Left = negative, right = positive" },
                    { label: "right stick Y", value: "up/down on right stick", note: "Same inversion as left Y" },
                    { label: "right stick X", value: "left/right on right stick", note: "Useful for turn in tank drive" },
                  ]}
                />
                <CodeBlock filename="axis example" code={`// Tank drive — negate Y axes so forward = positive
double leftPower  = -gamepad1.left_stick_y;
double rightPower = -gamepad1.right_stick_y;`} />
              </div>

              {/* trigger */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Gamepad}>
                  <Dropdown>gamepad 1</Dropdown> <Dropdown>right trigger</Dropdown>
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Returns the analog trigger value from <code>0.0</code>{" "}
                  (released) to <code>1.0</code> (fully pressed). Use a{" "}
                  <strong>compare</strong> block with a threshold like{" "}
                  <code>&gt; 0.05</code> to detect a meaningful press, or
                  pass the value directly to a motor for proportional control.
                </p>
                <NoteBox type="tip">
                  Never compare triggers with <code>== 1.0</code>. Triggers
                  return a floating-point value and will rarely hit exactly 1.
                  Use <code>&gt; 0.05</code> (or similar) instead.
                </NoteBox>
                <CodeBlock filename="trigger example" code={`// Proportional intake speed from right trigger
double intakePower = gamepad1.right_trigger; // 0.0 – 1.0
intake.setPower(intakePower);`} />
              </div>

              {/* button */}
              <div className="mt-8 space-y-3">
                <BooleanBlock colour={C.Gamepad}>
                  <Dropdown>gamepad 1</Dropdown> <Dropdown>A</Dropdown> pressed
                </BooleanBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Returns <code>true</code> while the button is held. Available
                  buttons: A, B, X, Y, D-pad up/down/left/right, left bumper,
                  right bumper. Use inside an <strong>if</strong> block for
                  actions that run while held, or add edge-detection logic for
                  one-shot toggles.
                </p>
                <SpecTable
                  rows={[
                    { label: "A / B / X / Y", value: "face buttons", note: "Common for claw, arm, intake toggles" },
                    { label: "left/right bumper", value: "shoulder buttons (LB / RB)", note: "Good for secondary functions" },
                    { label: "D-pad up/down/left/right", value: "directional pad", note: "Good for fine adjustments" },
                  ]}
                />
                <CodeBlock filename="button example" code={`// Toggle claw open/closed on A press (edge detection)
boolean lastA = false;
while (opModeIsActive()) {
    if (gamepad1.a && !lastA) {
        clawOpen = !clawOpen;
        claw.setPosition(clawOpen ? 0.9 : 0.1);
    }
    lastA = gamepad1.a; // update at end of loop
}`} />
              </div>

              {/* Example composition */}
              <h3 className="mt-10 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Example — Tank drive with trigger intake
              </h3>
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-5 overflow-x-auto">
                <ContainerBlock colour={C.Lifecycle} header={<>while OpMode is active</>}>
                  <BlockStack>
                    <StatementBlock colour={C.Motors}>
                      set power of <TextChip>left</TextChip> to <NumInput><ReporterBlock colour={C.Math}>negate <NumInput><ReporterBlock colour={C.Gamepad}><Dropdown>gamepad 1</Dropdown> <Dropdown>left stick Y</Dropdown></ReporterBlock></NumInput></ReporterBlock></NumInput>
                    </StatementBlock>
                    <StatementBlock colour={C.Motors}>
                      set power of <TextChip>right</TextChip> to <NumInput><ReporterBlock colour={C.Math}>negate <NumInput><ReporterBlock colour={C.Gamepad}><Dropdown>gamepad 1</Dropdown> <Dropdown>right stick Y</Dropdown></ReporterBlock></NumInput></ReporterBlock></NumInput>
                    </StatementBlock>
                    <StatementBlock colour={C.Motors}>
                      set power of <TextChip>intake</TextChip> to <NumInput><ReporterBlock colour={C.Gamepad}><Dropdown>gamepad 1</Dropdown> <Dropdown>right trigger</Dropdown></ReporterBlock></NumInput>
                    </StatementBlock>
                    <StatementBlock colour={C.Telemetry}>
                      telemetry update
                    </StatementBlock>
                  </BlockStack>
                </ContainerBlock>
              </div>
            </Prose>
          ),
        },

        // ── TELEMETRY ────────────────────────────────────────────────────────
        {
          id: "telemetry",
          title: "Telemetry",
          content: (
            <Prose>
              <p>
                Telemetry sends text from the robot to the Driver Station screen
                in real time. Use it to display sensor values, motor powers,
                and status messages during both init and the match loop.
              </p>
              <NoteBox type="warning">
                <strong>Telemetry update</strong> must be called at the end of
                every loop iteration. Without it, <strong>telemetry add</strong>{" "}
                buffers the data internally but the Driver Station screen never
                refreshes.
              </NoteBox>

              {/* add data */}
              <div className="mt-6 space-y-3">
                <StatementBlock colour={C.Telemetry}>
                  telemetry add <TextChip>Power</TextChip> = <NumInput />
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Queues a labeled key/value line. The first field is the label
                  (any text); the second slot accepts any block whose value you
                  want to display. Nothing appears on screen until you call{" "}
                  <strong>telemetry update</strong>.
                </p>
                <CodeBlock filename="addData example" code={`telemetry.addData("Left power", leftMotor.getPower());
telemetry.addData("Right power", rightMotor.getPower());
telemetry.addData("Arm ticks", arm.getCurrentPosition());
telemetry.update(); // send all three lines at once`} />
              </div>

              {/* add line */}
              <div className="mt-8 space-y-3">
                <StatementBlock colour={C.Telemetry}>
                  telemetry line <TextChip>--- Status ---</TextChip>
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Queues a plain text line with no label — useful for section
                  headers or separator lines between groups of data.
                </p>
                <CodeBlock filename="addLine example" code={`telemetry.addLine("--- Drive ---");
telemetry.addData("L", leftPower);
telemetry.addData("R", rightPower);
telemetry.addLine("--- Arm ---");
telemetry.addData("ticks", arm.getCurrentPosition());
telemetry.update();`} />
              </div>

              {/* update */}
              <div className="mt-8 space-y-3">
                <StatementBlock colour={C.Telemetry}>
                  telemetry update
                </StatementBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Flushes all queued lines to the Driver Station screen. Place
                  this at the <strong>end</strong> of the main loop and also
                  after any init status messages before{" "}
                  <code>waitForStart</code>.
                </p>
              </div>

              {/* Example composition */}
              <h3 className="mt-10 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Example — Telemetry dashboard in the loop
              </h3>
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-5 overflow-x-auto">
                <ContainerBlock colour={C.Lifecycle} header={<>while OpMode is active</>}>
                  <BlockStack>
                    <StatementBlock colour={C.Telemetry}>
                      telemetry line <TextChip>--- Drive ---</TextChip>
                    </StatementBlock>
                    <StatementBlock colour={C.Telemetry}>
                      telemetry add <TextChip>Left</TextChip> = <NumInput><ReporterBlock colour={C.Motors}>position of <TextChip>left</TextChip></ReporterBlock></NumInput>
                    </StatementBlock>
                    <StatementBlock colour={C.Telemetry}>
                      telemetry add <TextChip>Right</TextChip> = <NumInput><ReporterBlock colour={C.Motors}>position of <TextChip>right</TextChip></ReporterBlock></NumInput>
                    </StatementBlock>
                    <StatementBlock colour={C.Telemetry}>
                      telemetry update
                    </StatementBlock>
                  </BlockStack>
                </ContainerBlock>
              </div>
            </Prose>
          ),
        },

        // ── SENSORS ─────────────────────────────────────────────────────────
        {
          id: "sensors",
          title: "Sensors",
          content: (
            <Prose>
              <p>
                Sensor blocks read data from hardware attached to the REV Control
                Hub. All sensors must be retrieved with a{" "}
                <strong>Get Hardware</strong> block during initialization before
                they can be read.
              </p>
              <NoteBox type="info">
                The hardware name in the Get Hardware block must exactly match
                the name in your robot configuration on the Driver Station —
                including capitalization and underscores.
              </NoteBox>

              {/* touch sensor */}
              <div className="mt-6 space-y-3">
                <BooleanBlock colour={C.Sensors}>
                  <TextChip>touchSensor</TextChip> is pressed
                </BooleanBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Returns <code>true</code> when the REV Touch Sensor button is
                  physically depressed. Use it as the condition in an{" "}
                  <strong>if</strong> block or a <strong>while condition</strong>{" "}
                  loop to stop a motor when a limit is hit.
                </p>
                <CodeBlock filename="touch sensor example" code={`// Stop lifting when the arm hits the upper limit switch
while (!limitSwitch.isPressed() && opModeIsActive()) {
    arm.setPower(0.4);
}
arm.setPower(0);`} />
              </div>

              {/* color sensor */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Sensors}>
                  <TextChip>colorSensor</TextChip> red
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Returns the red channel intensity (0–255) from a REV Color
                  Sensor V3. Similar blocks exist for <code>blue</code>,{" "}
                  <code>green</code>, and <code>alpha</code> (overall brightness).
                  Enable the built-in LED first for accurate reflected-light
                  readings.
                </p>
                <NoteBox type="tip">
                  Turn the color sensor&apos;s LED on during init with{" "}
                  <code>colorSensor.enableLed(true)</code> for accurate surface
                  color detection. Leave it off for ambient light measurement.
                </NoteBox>
                <CodeBlock filename="color sensor example" code={`colorSensor.enableLed(true); // init phase

// In the loop — detect red vs blue alliance marker
int r = colorSensor.red();
int b = colorSensor.blue();
if (r > b) {
    telemetry.addData("Color", "RED");
} else {
    telemetry.addData("Color", "BLUE");
}
telemetry.update();`} />
              </div>

              {/* IMU */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Sensors}>
                  <TextChip>imu</TextChip> heading (degrees)
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Reads the robot&apos;s current yaw (heading) angle in degrees
                  from the REV IMU built into the Control Hub. Positive values
                  are counter-clockwise. Use this for heading-corrected driving
                  or turning to a specific angle.
                </p>
                <CodeBlock filename="IMU heading example" code={`// Turn until the robot faces 90 degrees
while (Math.abs(imu.getRobotYawPitchRollAngles()
                   .getYaw(AngleUnit.DEGREES) - 90.0) > 2.0
       && opModeIsActive()) {
    double heading = imu.getRobotYawPitchRollAngles()
                        .getYaw(AngleUnit.DEGREES);
    double error   = 90.0 - heading;
    leftMotor.setPower( 0.3 * Math.signum(error));
    rightMotor.setPower(-0.3 * Math.signum(error));
}
leftMotor.setPower(0);
rightMotor.setPower(0);`} />
              </div>
            </Prose>
          ),
        },

        // ── MATH ────────────────────────────────────────────────────────────
        {
          id: "math",
          title: "Math",
          content: (
            <Prose>
              <p>
                Math blocks produce numeric values — plug them into any slot
                that expects a number, such as the power slot of{" "}
                <strong>Set Power</strong> or the value slot of{" "}
                <strong>Telemetry Add</strong>. All math blocks are{" "}
                <em>reporter blocks</em> (rounded pill shape) — they return a
                value rather than performing an action.
              </p>

              {/* number literal */}
              <div className="mt-6 space-y-3">
                <ReporterBlock colour={C.Math}>0</ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  A literal number. Click the field to type any integer or
                  decimal. Plug it into any slot that expects a number.
                </p>
              </div>

              {/* arithmetic */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Math}>
                  <NumInput /> <Dropdown>+</Dropdown> <NumInput />
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Performs arithmetic on two numbers. Choose the operator from
                  the dropdown.
                </p>
                <SpecTable
                  rows={[
                    { label: "+", value: "addition" },
                    { label: "−", value: "subtraction" },
                    { label: "×", value: "multiplication" },
                    { label: "÷", value: "division", note: "Integer division truncates — use decimal inputs for float results" },
                    { label: "mod", value: "remainder (modulo)", note: "e.g. 7 mod 3 = 1" },
                  ]}
                />
              </div>

              {/* negate */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Math}>
                  negate <NumInput />
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Flips the sign of a number. This is the most common block in
                  FTC — use it to invert the Y-axis of a joystick so pushing
                  forward gives positive motor power.
                </p>
                <CodeBlock filename="negate example" code={`// Invert left stick Y so forward = positive power
double power = -gamepad1.left_stick_y;`} />
              </div>

              {/* math unary */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Math}>
                  <Dropdown>abs</Dropdown> of <NumInput />
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Applies a single-argument math function. Choose from the
                  dropdown.
                </p>
                <SpecTable
                  rows={[
                    { label: "abs", value: "absolute value", note: "abs(−0.5) = 0.5 — use for deadzone comparisons" },
                    { label: "sqrt", value: "square root", note: "sqrt(9) = 3" },
                    { label: "round", value: "round to nearest integer" },
                    { label: "floor / ceil", value: "round down / round up" },
                    { label: "sin / cos / tan", value: "trig functions", note: "Input in radians" },
                    { label: "toRadians / toDegrees", value: "angle unit conversion" },
                    { label: "signum", value: "sign of number", note: "Returns −1, 0, or 1" },
                  ]}
                />
              </div>

              {/* math binary */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Math}>
                  <Dropdown>max</Dropdown> of <NumInput /> and <NumInput />
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Applies a two-argument math function.
                </p>
                <SpecTable
                  rows={[
                    { label: "max", value: "larger of two numbers", note: "max(0.6, 1.2) = 1.2" },
                    { label: "min", value: "smaller of two numbers", note: "min(0.6, 1.2) = 0.6" },
                    { label: "pow", value: "raise to a power", note: "pow(2, 3) = 8" },
                    { label: "hypot", value: "Euclidean distance √(a²+b²)", note: "Useful for mecanum drive magnitude" },
                    { label: "atan2", value: "angle from x/y components", note: "Returns radians" },
                  ]}
                />
                <CodeBlock filename="clamp with max/min" code={`// Clamp power to [-1, 1]
double clamped = Math.max(-1.0, Math.min(1.0, rawPower));`} />
              </div>

              {/* deadzone */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Math}>
                  deadzone <NumInput /> below <TextChip>0.05</TextChip>
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  Returns <code>0</code> if the absolute value of the input is
                  below the threshold, otherwise passes the input through
                  unchanged. Apply this to every joystick axis to prevent motors
                  from creeping when the stick idles slightly off center.
                </p>
                <NoteBox type="tip">
                  A threshold of <code>0.05</code> is a safe starting point.
                  Increase it if your controller has a noticeable drift at rest.
                </NoteBox>
                <CodeBlock filename="deadzone example" code={`// Prevent drive creep from joystick drift
double raw = -gamepad1.left_stick_y;
double power = Math.abs(raw) > 0.05 ? raw : 0.0;
leftMotor.setPower(power);`} />
              </div>

              {/* ternary */}
              <div className="mt-8 space-y-3">
                <ReporterBlock colour={C.Math}>
                  if <BoolInput /> then <NumInput /> else <NumInput />
                </ReporterBlock>
                <p className="text-sm leading-relaxed text-slate-400">
                  A compact inline conditional — returns the first value when the
                  condition is true, the second when false. Equivalent to{" "}
                  <code>condition ? a : b</code> in Java.
                </p>
                <CodeBlock filename="ternary example" code={`// Full power when trigger pressed, zero otherwise
double power = gamepad1.right_trigger > 0.05 ? 1.0 : 0.0;
intake.setPower(power);`} />
              </div>

              {/* Example composition */}
              <h3 className="mt-10 mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Example — Deadzone + negate on a drive axis
              </h3>
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-5 overflow-x-auto">
                <StatementBlock colour={C.Motors}>
                  set power of <TextChip>left</TextChip> to{" "}
                  <NumInput>
                    <ReporterBlock colour={C.Math}>
                      deadzone{" "}
                      <NumInput>
                        <ReporterBlock colour={C.Math}>
                          negate{" "}
                          <NumInput>
                            <ReporterBlock colour={C.Gamepad}>
                              <Dropdown>gamepad 1</Dropdown>{" "}
                              <Dropdown>left stick Y</Dropdown>
                            </ReporterBlock>
                          </NumInput>
                        </ReporterBlock>
                      </NumInput>{" "}
                      below <TextChip>0.05</TextChip>
                    </ReporterBlock>
                  </NumInput>
                </StatementBlock>
              </div>
            </Prose>
          ),
        },
      ]}
    />
  );
}
