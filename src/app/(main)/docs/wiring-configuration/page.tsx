import type { Metadata } from "next";
import Link from "next/link";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import DocVideo from "@/components/DocVideo";
import { NoteBox, SpecTable, InfoGrid, Prose, StepList } from "@/components/DocPrimitives";

export const metadata: Metadata = {
  title: "Wiring & Configuration – FTC Programming Hub",
  description:
    "A practical guide to wiring an FTC robot and naming every device in the robot configuration — what order to build in, how to route wires, what common mistakes look like, and how a config name becomes the string in your hardwareMap.get() call.",
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Page-local diagrams.
 *
 * These are our own schematics of our own content — the power chain, the
 * two-hub config tree, and the config-name-to-code contract. They deliberately
 * do NOT depict the physical layout of the board; port counts and numbering are
 * verified against REV and FIRST documentation, connector placement is not.
 * ───────────────────────────────────────────────────────────────────────────── */

const box = "fill-slate-100 stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700";
const boxAccent = "fill-amber-500/10 stroke-amber-500/50";
const label = "fill-slate-700 dark:fill-slate-300";
const muted = "fill-slate-500 dark:fill-slate-500";
const line = "stroke-slate-400 dark:stroke-slate-600";

function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-5">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        {children}
      </div>
      <figcaption className="mt-2 text-xs text-slate-500">{caption}</figcaption>
    </figure>
  );
}

function PowerChainDiagram() {
  return (
    <svg
      viewBox="0 0 700 190"
      className="h-auto w-full min-w-[560px]"
      role="img"
      aria-label="Power chain: 12 volt battery with a 20 amp in-line fuse, through the single main power switch, into an XT30 distribution block, then to the Control Hub and Expansion Hub."
    >
      <title>Robot power chain</title>
      <defs>
        <marker id="wc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,1 L7,4 L0,7 z" className="fill-slate-400 dark:fill-slate-600" />
        </marker>
      </defs>

      <rect x="8" y="60" width="132" height="46" rx="7" className={box} strokeWidth="1.5" />
      <text x="74" y="80" textAnchor="middle" className={`${label} text-[12px] font-semibold`}>12 V NiMH</text>
      <text x="74" y="96" textAnchor="middle" className={`${muted} text-[11px]`}>main battery</text>

      <line x1="142" y1="83" x2="212" y2="83" className={line} strokeWidth="1.5" markerEnd="url(#wc-arrow)" />
      <text x="177" y="48" textAnchor="middle" className={`${muted} text-[10px]`}>20 A fuse</text>
      <text x="177" y="61" textAnchor="middle" className={`${muted} text-[10px]`}>(already in the</text>
      <text x="177" y="73" textAnchor="middle" className={`${muted} text-[10px]`}>battery lead)</text>

      <rect x="216" y="60" width="132" height="46" rx="7" className={boxAccent} strokeWidth="1.5" />
      <text x="282" y="80" textAnchor="middle" className={`${label} text-[12px] font-semibold`}>Main switch</text>
      <text x="282" y="96" textAnchor="middle" className={`${muted} text-[11px]`}>exactly one</text>

      <line x1="350" y1="83" x2="416" y2="83" className={line} strokeWidth="1.5" markerEnd="url(#wc-arrow)" />

      <rect x="420" y="60" width="132" height="46" rx="7" className={box} strokeWidth="1.5" />
      <text x="486" y="80" textAnchor="middle" className={`${label} text-[12px] font-semibold`}>XT30 block</text>
      <text x="486" y="96" textAnchor="middle" className={`${muted} text-[11px]`}>optional splitter</text>

      <path d="M554,83 L570,83 L570,44 L590,44" className={line} strokeWidth="1.5" fill="none" markerEnd="url(#wc-arrow)" />
      <path d="M554,83 L570,83 L570,122 L590,122" className={line} strokeWidth="1.5" fill="none" markerEnd="url(#wc-arrow)" />

      <rect x="594" y="26" width="100" height="36" rx="7" className={box} strokeWidth="1.5" />
      <text x="644" y="49" textAnchor="middle" className={`${label} text-[11px] font-semibold`}>Control Hub</text>

      <rect x="594" y="104" width="100" height="36" rx="7" className={box} strokeWidth="1.5" />
      <text x="644" y="121" textAnchor="middle" className={`${label} text-[11px] font-semibold`}>Expansion</text>
      <text x="644" y="133" textAnchor="middle" className={`${label} text-[11px] font-semibold`}>Hub</text>

      <text x="350" y="172" textAnchor="middle" className={`${muted} text-[11px]`}>
        Motors, servos, and sensors draw power only from the hub they plug into — never from another port or a second hub.
      </text>
    </svg>
  );
}

function TwoHubConfigDiagram() {
  return (
    <svg
      viewBox="0 0 700 268"
      className="h-auto w-full min-w-[560px]"
      role="img"
      aria-label="Configuration tree: a Control Hub Portal with two hubs beneath it, each with its own motor ports numbered zero through three, showing that port numbering restarts on the second hub."
    >
      <title>How two hubs appear in the robot configuration</title>

      <rect x="248" y="8" width="204" height="36" rx="7" className={boxAccent} strokeWidth="1.5" />
      <text x="350" y="31" textAnchor="middle" className={`${label} text-[12px] font-semibold`}>Control Hub Portal</text>

      <path d="M350,44 L350,62 L166,62 L166,82" className={line} strokeWidth="1.5" fill="none" />
      <path d="M350,44 L350,62 L534,62 L534,82" className={line} strokeWidth="1.5" fill="none" />

      <rect x="46" y="82" width="240" height="150" rx="7" className={box} strokeWidth="1.5" />
      <text x="166" y="103" textAnchor="middle" className={`${label} text-[12px] font-semibold`}>Control Hub</text>
      <text x="62" y="128" className={`${muted} font-mono text-[11px]`}>Motor 0</text>
      <text x="150" y="128" className={`${label} font-mono text-[11px]`}>front_left</text>
      <text x="62" y="147" className={`${muted} font-mono text-[11px]`}>Motor 1</text>
      <text x="150" y="147" className={`${label} font-mono text-[11px]`}>front_right</text>
      <text x="62" y="166" className={`${muted} font-mono text-[11px]`}>Motor 2</text>
      <text x="150" y="166" className={`${label} font-mono text-[11px]`}>back_left</text>
      <text x="62" y="185" className={`${muted} font-mono text-[11px]`}>Motor 3</text>
      <text x="150" y="185" className={`${label} font-mono text-[11px]`}>back_right</text>
      <text x="62" y="211" className={`${muted} font-mono text-[11px]`}>I2C 0</text>
      <text x="150" y="211" className={`${label} font-mono text-[11px]`}>imu</text>

      <rect x="414" y="82" width="240" height="150" rx="7" className={box} strokeWidth="1.5" />
      <text x="534" y="103" textAnchor="middle" className={`${label} text-[12px] font-semibold`}>Expansion Hub 2</text>
      <text x="430" y="128" className={`${muted} font-mono text-[11px]`}>Motor 0</text>
      <text x="518" y="128" className={`${label} font-mono text-[11px]`}>lift_motor</text>
      <text x="430" y="147" className={`${muted} font-mono text-[11px]`}>Motor 1</text>
      <text x="518" y="147" className={`${label} font-mono text-[11px]`}>intake</text>
      <text x="430" y="166" className={`${muted} font-mono text-[11px]`}>Servo 0</text>
      <text x="518" y="166" className={`${label} font-mono text-[11px]`}>claw_servo</text>
      <text x="430" y="185" className={`${muted} font-mono text-[11px]`}>Digital 1</text>
      <text x="518" y="185" className={`${label} font-mono text-[11px]`}>touch_limit</text>
      <text x="430" y="211" className={`${muted} font-mono text-[11px]`}>I2C 0</text>
      <text x="518" y="211" className={`${label} font-mono text-[11px]`}>pinpoint</text>

      <text x="350" y="256" textAnchor="middle" className={`${muted} text-[11px]`}>
        Both hubs have a &ldquo;Motor 0&rdquo;. Numbering restarts — the name is the only thing your code ever sees.
      </text>
    </svg>
  );
}

function ConfigToCodeDiagram() {
  return (
    <svg
      viewBox="0 0 700 240"
      className="h-auto w-full min-w-[600px]"
      role="img"
      aria-label="The chain from hardware to code: motor port zero on the hub, an entry in the robot configuration with a type and the name front_left, and a hardwareMap.get call in Java using that same string. The configuration name and the Java string must match exactly."
    >
      <title>Config name to code</title>
      <defs>
        <marker id="wc-arrow2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,1 L7,4 L0,7 z" className="fill-slate-400 dark:fill-slate-600" />
        </marker>
      </defs>

      <text x="78" y="22" textAnchor="middle" className={`${muted} text-[10px] font-semibold tracking-widest`}>ON THE ROBOT</text>
      <text x="330" y="22" textAnchor="middle" className={`${muted} text-[10px] font-semibold tracking-widest`}>IN THE CONFIGURATION</text>
      <text x="588" y="22" textAnchor="middle" className={`${muted} text-[10px] font-semibold tracking-widest`}>IN YOUR CODE</text>

      <rect x="12" y="46" width="132" height="60" rx="7" className={box} strokeWidth="1.5" />
      <text x="78" y="70" textAnchor="middle" className={`${label} text-[12px] font-semibold`}>Motor port 0</text>
      <text x="78" y="89" textAnchor="middle" className={`${muted} text-[11px]`}>+ encoder port 0</text>

      <line x1="146" y1="76" x2="200" y2="76" className={line} strokeWidth="1.5" markerEnd="url(#wc-arrow2)" />

      <rect x="204" y="46" width="252" height="60" rx="7" className={box} strokeWidth="1.5" />
      <text x="220" y="70" className={`${muted} font-mono text-[11px]`}>type:</text>
      <text x="278" y="70" className={`${label} font-mono text-[11px]`}>&lt;pick your motor&gt;</text>
      <text x="220" y="92" className={`${muted} font-mono text-[11px]`}>name:</text>
      <text x="278" y="92" className="fill-amber-600 dark:fill-amber-400 font-mono text-[12px] font-semibold">&quot;front_left&quot;</text>

      <line x1="458" y1="76" x2="478" y2="76" className={line} strokeWidth="1.5" markerEnd="url(#wc-arrow2)" />

      <rect x="482" y="46" width="206" height="60" rx="7" className={box} strokeWidth="1.5" />
      <text x="496" y="70" className={`${label} font-mono text-[11px]`}>hardwareMap.get(</text>
      <text x="510" y="86" className={`${label} font-mono text-[11px]`}>DcMotor.class,</text>
      <text x="510" y="101" className="fill-amber-600 dark:fill-amber-400 font-mono text-[12px] font-semibold">&quot;front_left&quot;)</text>

      <path
        d="M330,120 L330,150 L560,150 L560,116"
        className="stroke-amber-500/70"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
      />
      <text x="445" y="176" textAnchor="middle" className="fill-amber-600 dark:fill-amber-400 text-[12px] font-semibold">
        these two strings must match exactly
      </text>
      <text x="445" y="196" textAnchor="middle" className={`${muted} text-[11px]`}>
        case-sensitive, and checked when the OpMode runs —
      </text>
      <text x="445" y="212" textAnchor="middle" className={`${muted} text-[11px]`}>
        never at compile time, so a typo builds and deploys fine
      </text>
    </svg>
  );
}

export default function WiringConfigurationPage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs" },
        { label: "Wiring & Configuration" },
      ]}
      title="Wiring & Configuration"
      description="Wiring and configuration are one job, not two — the port you plug a device into is the port you pick in the robot configuration, and the name you type there is the exact string your Java code asks for. This is a build-order walkthrough: power first, then motors, servos, sensors, a second hub if you need one, and finally the config-name-to-code handoff where most teams actually get stuck."
      badge="Wiring"
      badgeColor="emerald"
      readingTime="15 min"
      sections={[
        {
          id: "control-hub-ports",
          title: "Control Hub Port Map",
          content: (
            <Prose>
              <p>
                Every wire on the robot ends up at the{" "}
                <strong>REV Control Hub</strong>. Before you plug anything in,
                it&apos;s worth five minutes learning what each block of
                connectors is for, because your port budget shapes the robot
                design — you get four motors and six servos per hub, and that is
                usually the first wall a team hits.
              </p>
              <InfoGrid
                items={[
                  { label: "Motor", value: "4 ports", sub: "Numbered 0–3" },
                  { label: "Encoder", value: "4 ports", sub: "One per motor port" },
                  { label: "Servo", value: "6 ports", sub: "Numbered 0–5" },
                  { label: "I²C", value: "4 buses", sub: "For sensors" },
                  { label: "Digital", value: "8 channels", sub: "Across 4 plugs" },
                  { label: "Analog", value: "4 channels", sub: "Across 2 plugs" },
                  { label: "+5 V Aux", value: "2 ports", sub: "Powered USB hub" },
                  { label: "RS485", value: "2 ports", sub: "To a second hub" },
                ]}
              />
              <p>
                Almost every connector on the hub is <strong>keyed and
                locking</strong> — it physically only goes in one way, and it
                clicks. That is deliberate, and it means most wiring mistakes are
                mistakes of <em>which port</em>, not <em>which orientation</em>.
                The exceptions are the servo headers and the +5 V auxiliary pins,
                which are bare 0.1&Prime; pins you absolutely can plug in
                backwards.
              </p>
              <p>
                Working around the board: <strong>motor ports</strong> take a
                chunky two-pin plug and carry all the current, while each{" "}
                <strong>encoder port</strong>{" "}sits beside its matching motor port
                and takes a small four-pin plug carrying only signal.{" "}
                <strong>Servo ports</strong>{" "}are the row of three-pin headers.{" "}
                <strong>Sensors</strong>{" "}land in one of three families —{" "}
                <strong>I²C</strong>{" "}for smart sensors like colour and distance,{" "}
                <strong>digital</strong>{" "}for anything that is on or off like a
                limit switch, and <strong>analog</strong> for anything that
                reports a range, like a potentiometer. Power comes in through the
                yellow <strong>XT30</strong> connectors, and the two{" "}
                <strong>RS485</strong>{" "}ports are how you chain on a second hub.
              </p>
              <NoteBox type="tip">
                If you run a webcam, plug it into the{" "}
                <strong>USB 3.0</strong>{" "}Type-A port rather than the USB 2.0 one.
                A static shock on the USB 2.0 port is a known way to knock the
                Control Hub&apos;s Wi-Fi offline mid-match.
              </NoteBox>
              <DocVideo docSlug="wiring-configuration" sectionId="control-hub-ports" />
              <p>
                <strong>The order to build in.</strong>{" "}Wiring a robot in the
                wrong order means taking it apart again. Power comes first
                because everything hangs off it, and configuration comes last
                because you cannot configure a port until something is plugged
                into it:
              </p>
              <StepList
                steps={[
                  "Mount the hub somewhere you can still see its status LED and reach its ports once the robot is built.",
                  "Build the power spine — battery, main switch, and the run to the hub — before any motors go on.",
                  "Wire motors one at a time, and plug each motor's encoder into the encoder port with the same number.",
                  "Wire servos, checking the header orientation on every single one.",
                  "Wire sensors last; they are the thinnest wires and the easiest to damage while you are still moving things around.",
                  "Add a second hub only if you have genuinely run out of ports.",
                  "Power on, check the status LEDs, then build the robot configuration and name every device.",
                  "Deploy an OpMode and confirm each device responds before you trust the robot on a field.",
                ]}
              />
              <NoteBox type="info">
                The port counts and limits on this page come from REV&apos;s hub
                documentation and the FIRST Tech Challenge Competition Manual —
                both linked under{" "}
                <a href="#further-reading" className="link-accent">
                  Further Reading
                </a>
                . For labelled photographs of each connector block and the
                per-pin signal diagrams, go to those sources directly; they are
                the authoritative pictures. Setting up a brand-new hub — firmware,
                Wi-Fi name, pairing to a Driver Hub — is covered with a
                walkthrough video on the{" "}
                <Link href="/docs/rev-robotics#control-hub" className="link-accent">
                  REV Robotics page
                </Link>
                .
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "power",
          title: "Power & Battery Wiring",
          content: (
            <Prose>
              <p>
                Power is the part of the robot that can start a fire, and it is
                also the part that quietly ruins matches when it is merely
                sloppy. The chain itself is short: one 12 V battery, one fuse,
                one switch, then the hubs.
              </p>
              <Figure caption="The whole robot runs off one battery through one switch. Nothing bypasses the switch.">
                <PowerChainDiagram />
              </Figure>
              <p>
                Your robot must have exactly one 12 V NiMH battery, and it has to
                be one of the packs on the approved list in the game manual — you
                cannot substitute a similar-looking battery from another brand.
                The 20 A fuse already lives in the in-line holder on the
                battery&apos;s lead; you do not add one. The battery then feeds{" "}
                <strong>exactly one main power switch</strong>, also from an
                approved list, and that switch has to control everything. Mount it
                where a person can actually reach it in a hurry, away from
                anything fast-moving that could knock it.
              </p>
              <NoteBox type="warning">
                If you ever replace the battery&apos;s connector,{" "}
                <strong>pull the 20 A fuse out first</strong>. Cutting a live
                battery lead shorts twelve volts across your cutters.
              </NoteBox>
              <p>
                From the switch, power goes to the hubs through their yellow XT30
                ports and nowhere else — a hub may only ever be powered from the
                main battery, never from another hub or a circuit you built. If
                you are running two hubs, or want a tidier layout, split the
                switched 12 V with an XT30 distribution block rather than
                daisy-chaining everything off one port.
              </p>
              <NoteBox type="warning">
                <strong>Never</strong>{" "}plug a battery charger into a hub&apos;s
                XT30 port. It voids the warranty and destroys the hub. Batteries
                come off the robot to charge.
              </NoteBox>
              <p>
                <strong>Wire thickness matters and is checked at inspection.</strong>{" "}
                Anything carrying battery or motor power needs to be at least{" "}
                <strong>18 AWG</strong>. Servo and PWM wiring, LEDs, and the
                smaller motors like the REV Core Hex can be{" "}
                <strong>22 AWG</strong>. Signal wiring — I²C, digital, analog,
                encoders, RS485 — can be as thin as <strong>28 AWG</strong>.
                Wires that came attached to a part you bought are fine as they
                are; you never need to rewire a motor&apos;s factory leads. And
                you cannot twist two thin wires together to stand in for one
                thick one. On the 12 V and +5 V lines, keep positive in red (or
                yellow, white, brown, or black-with-stripe) and negative in black
                or blue, along the whole length — that rule does not apply to
                motor, sensor, or servo cables.
              </p>
              <p>
                One more rule worth knowing before you get creative: the robot
                frame is not a wire. Everything has to be electrically isolated
                from the chassis, and if you want the electronics grounded to the
                frame it has to go through an approved resistive grounding strap.
              </p>
              <p>
                <strong>Routing is not cosmetic.</strong>{" "}REV&apos;s own guidance
                is worth following literally: use cables of roughly the right
                length so you are not stuffing loops of excess somewhere, bundle
                with zip ties or Velcro straps, secure cables away from anywhere
                the robot moves — the drivetrain and any arm above all — and
                label wires by function, because in three weeks the bundle will be
                buried under a mechanism and you will not remember which motor
                lead is which.
              </p>
              <NoteBox type="tip">
                Leave deliberate slack wherever a wire crosses a joint that moves,
                and anchor the wire on <em>both</em> sides of that joint. A
                wire pulled taut by a slide at full extension is a wire that will
                eventually pull out of its connector — usually during a match,
                and usually looking like a software bug.
              </NoteBox>
              <p>
                Before every practice session and every match, do what REV calls a{" "}
                <strong>smart tug</strong>: take hold of each wire and pull with
                reasonable force to confirm the connection is actually seated.
                Ten seconds of tugging finds problems that would otherwise cost
                you a match.
              </p>
              <NoteBox type="warning">
                <strong>The XT30 is the connector most likely to betray you.</strong>{" "}
                Its pins compress with repeated use and the port starts to feel
                loose or wiggly. A marginal XT30 does not fail cleanly — it
                browns out under load, which looks like software going wrong.
                REV&apos;s documented symptoms of a brown-out are the Driver
                Station reporting power errors, the Driver Station making its
                disconnect sound, voltage on the Driver Station dropping to
                9 volts or lower while code runs, and motors visibly running
                slower than the power you commanded. If you see those, check the
                battery charge and the XT30 connections before you touch your
                code. REV publishes a procedure for carefully re-spreading
                compressed XT30 pins; note that compressed or overextended pins
                are not covered under warranty.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "motors",
          title: "Motors — Wiring & Configuration",
          content: (
            <Prose>
              <p>
                A motor needs two things plugged in: power, and — if you want to
                know where it is — its encoder. The power plug goes into one of
                the four <strong>motor ports</strong>, numbered 0 to 3. The
                encoder plug goes into the <strong>encoder port with the same
                number</strong>, right beside it.
              </p>
              <NoteBox type="warning">
                Getting those two numbers out of sync is the single most common
                motor wiring mistake. The hub reads encoder counts from whatever
                is plugged into the encoder port, with no knowledge of which
                motor the power came from. Plug the motor into port 0 and its
                encoder into port 1 and everything looks wired — but the position
                you read back belongs to a different mechanism.
              </NoteBox>
              <p>
                Each motor port supplies up to <strong>10 A continuously</strong>,
                which is more than any legal FTC motor needs, so in practice
                you&apos;re limited by the rules rather than the hardware: a robot
                may have at most <strong>eight motors</strong> in total, counted
                across every configuration you bring to an event. If you need to
                drive more motors than you have ports, a REV SPARKmini takes a
                control signal from a spare servo port and pulls its motor
                current from its own connection to the main battery — but the
                eight-motor ceiling still applies.
              </p>
              <p>
                You are allowed to shorten a motor&apos;s leads and add
                connectors, as long as whatever you splice in meets the gauge
                minimums. Route the leads so no mechanism can pinch, cut, or drag
                them, and power the robot down at the main switch before plugging
                or unplugging anything on a motor port.
              </p>
              <p>
                <strong>Now name it.</strong>{" "}On the Driver Station, choose{" "}
                <strong>Configure Robot</strong>, open your hub, and touch{" "}
                <strong>Motors</strong>. You get one row per port. Find the row
                whose number matches the port you physically used, choose the
                motor type from the dropdown, and type a name.
              </p>
              <NoteBox type="warning">
                That dropdown is not cosmetic. The motor type you pick carries the
                encoder&apos;s counts per revolution, the motor&apos;s maximum
                RPM, its gearing, and the built-in PIDF constants the hub uses for
                velocity and position control. Choose the wrong one and nothing
                errors — but every <code>RUN_TO_POSITION</code> move and every{" "}
                <code>setVelocity()</code>{" "}call is quietly scaled wrong. Match it
                to the motor you actually installed.
              </NoteBox>
              <p>
                Whatever you typed as the name is now the only handle your code
                has on that motor:
              </p>
              <CodeBlock
                filename="MotorFromConfig.java"
                code={`// Config: motor port 0 named "front_left", port 1 "front_right",
//         port 2 "back_left", port 3 "back_right".

DcMotor frontLeft  = hardwareMap.get(DcMotor.class, "front_left");
DcMotor frontRight = hardwareMap.get(DcMotor.class, "front_right");
DcMotor backLeft   = hardwareMap.get(DcMotor.class, "back_left");
DcMotor backRight  = hardwareMap.get(DcMotor.class, "back_right");

// Which way a motor spins is a mounting fact, not a config setting.
// Fix it here rather than by swapping the two motor leads.
frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
backLeft.setDirection(DcMotorSimple.Direction.REVERSE);`}
              />
              <p>
                <strong>What a bad encoder connection looks like.</strong>{" "}Push a
                small amount of power to the motor and watch{" "}
                <code>getCurrentPosition()</code>{" "}on telemetry while the shaft
                turns. If the number never moves, the encoder cable is not
                seated, is in the wrong port, or is damaged. If the number moves
                when a <em>different</em> motor runs, your two cables are
                swapped. Either way, the failure is loudest in{" "}
                <code>RUN_TO_POSITION</code>: with no encoder feedback the motor
                never reaches its target, so <code>isBusy()</code> stays{" "}
                <code>true</code>{" "}and a loop waiting on it will burn your entire
                autonomous period.
              </p>
              <p>
                The <code>DcMotor</code> and <code>DcMotorEx</code> APIs — run
                modes, encoder maths, velocity control, zero-power behaviour —
                are covered in depth on the{" "}
                <Link href="/docs/motors-servos" className="link-accent">
                  Motors &amp; Servos
                </Link>{" "}
                page.
              </p>
            </Prose>
          ),
        },
        {
          id: "servos",
          title: "Servos — Wiring & Configuration",
          content: (
            <Prose>
              <p>
                Servos plug into the row of six three-pin headers, numbered 0 to
                5. These are the one place on the hub where the connector will go
                on backwards without complaint, so check the pin order against
                the markings on the board <em>every time</em> — a reversed servo
                connector is a five-second mistake that reads like a dead servo.
              </p>
              <p>
                The hub feeds its servo ports at <strong>5 volts</strong>, and
                the ports share current in <strong>pairs — 0 and 1, 2 and 3, 4
                and 5 — with about 2 A per pair</strong>. That pairing is the
                practical constraint: two hungry servos on ports 0 and 1 compete
                for the same budget, while the same two servos on ports 0 and 2
                do not. If the Driver Station starts reporting power problems or
                the voltage sags when several servos move at once, spreading them
                across different pairs is the first thing to try.
              </p>
              <NoteBox type="info">
                Approved servo power devices — REV&apos;s Servo Power Module and
                Servo Hub, goBILDA&apos;s Servo Power Injector, Studica&apos;s
                Servo Power Block — supply <strong>6 volts</strong>{" "}
                instead of the hub&apos;s 5, and take their power from the main
                battery. This matters more than it sounds: a servo specified for
                6 to 8.4 volts may simply not behave properly on the hub&apos;s
                5 volts. Check your servo&apos;s voltage range against whatever is
                actually feeding it. That 6 V supply may only ever power servos.
              </NoteBox>
              <p>
                A robot may have at most <strong>eight servos</strong>, the same
                ceiling as motors. Servos also have to pass a legality check on
                their power output, which is why teams generally buy from the
                pre-approved list rather than sourcing something unusual.
              </p>
              <NoteBox type="warning">
                The rules set a stall-current ceiling for standard servos
                alongside the power limit, and a servo has to satisfy both — but
                that number is left blank in the current preview manual. Check the
                released Competition Manual or the Inspection Quick Reference
                list before buying a servo you have not used before.
              </NoteBox>
              <p>
                <strong>Configuring one</strong>{" "}works like motors: open{" "}
                <strong>Configure Robot</strong>, touch <strong>Servos</strong>,
                find your port number, pick the type, type a name, and save. The
                type you pick decides which class your code uses. A port set to{" "}
                <strong>Servo</strong>{" "}comes back as <code>Servo</code> and takes
                a position from 0.0 to 1.0. A port set to{" "}
                <strong>Continuous Rotation Servo</strong>{" "}comes back as{" "}
                <code>CRServo</code>{" "}and takes a power from -1.0 to 1.0. Ask for
                the wrong one in code and the device is effectively invisible —
                you get the same &ldquo;unable to find&rdquo; error as a
                misspelled name.
              </p>
              <CodeBlock
                filename="ServoFromConfig.java"
                code={`// Config: servo port 0 = "claw_servo"    (type: Servo)
//         servo port 1 = "intake_roller" (type: Continuous Rotation Servo)

Servo   clawServo    = hardwareMap.get(Servo.class,   "claw_servo");
CRServo intakeRoller = hardwareMap.get(CRServo.class, "intake_roller");

clawServo.setPosition(0.0);    // a position along the servo's travel
intakeRoller.setPower(0.0);    // a speed and direction, not a position`}
              />
              <NoteBox type="tip">
                Some vendors ship continuous-rotation servos that are meant to be
                configured as a plain <strong>Servo</strong> and driven with{" "}
                <code>setPosition()</code>{" "}on a 0.0 / 0.5 / 1.0 speed scale — the{" "}
                <Link href="/docs/swyft-robotics#cr-servos" className="link-accent">
                  Swyft Robotics page
                </Link>{" "}
                walks through one. When a vendor&apos;s instructions disagree with
                the general rule, follow the vendor.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "sensors",
          title: "Sensors, I²C Addressing & Encoders",
          content: (
            <Prose>
              <p>
                Sensors are the thinnest wires on the robot and the last thing you
                should wire, once mechanisms have stopped moving around. Which
                family a sensor belongs to decides both where it plugs in and what
                you pick in the configuration.
              </p>
              <p>
                <strong>Digital</strong>{" "}is for anything with two states — a limit
                switch, a touch sensor, a beam break. There are four digital
                connectors carrying eight channels, numbered 0 to 7, two per
                connector.
              </p>
              <NoteBox type="warning">
                A digital connector holds two channels, but a device like the REV
                Touch Sensor only works on the higher-numbered one. Plug a touch
                sensor into the connector holding channels 0 and 1 and then
                configure channel 0, and it will simply never report as pressed —
                no error, no warning, just a limit switch that never fires.
                Configure the odd channel of the pair.
              </NoteBox>
              <p>
                <strong>Analog</strong>{" "}is for sensors that report a range rather
                than on-or-off, a potentiometer being the classic example. Two
                connectors give you four analog channels, accepting up to 5 volts.
              </p>
              <p>
                <strong>I²C</strong>{" "}is for smart sensors — colour, distance,
                odometry computers, the IMU. This is the family with a real
                gotcha, so it&apos;s worth understanding rather than memorising.
              </p>
              <p>
                The hub has <strong>four independent I²C buses</strong>, one per
                connector. Several sensors can share a single bus — that is the
                whole point of I²C — but every device on a bus identifies itself
                by an address, and two devices answering to the same address on
                the same bus means you cannot trust either reading. Most FTC
                sensors have their address fixed in the driver, so when two
                collide the fix is physical: move one to a different bus.
              </p>
              <SpecTable
                rows={[
                  { label: "REV Color Sensor V3", value: "0x52", note: "Two of these cannot share a bus" },
                  { label: "REV 2m Distance Sensor", value: "0x29", note: "Sometimes written 0x52 as an 8-bit address" },
                  { label: "goBILDA Pinpoint", value: "0x31", note: "Odometry computer" },
                ]}
              />
              <NoteBox type="info">
                The Control Hub&apos;s built-in IMU is permanently wired to{" "}
                <strong>I²C bus 0, port 0</strong>. That does not make bus 0
                off-limits — plug another sensor in and use the{" "}
                <strong>Add</strong>{" "}button in the configuration screen — but bus
                0 is never actually empty, which is worth remembering when you are
                spreading devices across buses. The IMU itself is covered on the{" "}
                <Link href="/docs/rev-robotics#imu" className="link-accent">
                  REV Robotics page
                </Link>
                .
              </NoteBox>
              <NoteBox type="tip">
                Before buying an I²C sensor, check that the FTC SDK supports it or
                that a maintained community driver exists. Most I²C sensors on the
                market have no FTC driver at all, and writing one is a project in
                itself rather than an afternoon.
              </NoteBox>
              <p>
                <strong>Encoders</strong>{" "}get their own four ports. Beyond the
                encoders built into your motors, you can plug a standalone shaft
                encoder such as the REV Through Bore Encoder into any of them and
                measure an output shaft directly, which saves you from
                back-calculating through a gear ratio. It resolves{" "}
                <strong>8192 counts per revolution</strong>, and it needs
                REV&apos;s 6-pin-to-4-pin adapter cable to reach a hub encoder
                port.
              </p>
              <NoteBox type="warning">
                The Through Bore Encoder also outputs an absolute position signal,
                but the FTC control system cannot read it — the hubs accept
                incremental encoder input only. Plan on a homing routine at the
                start of a match rather than expecting a mechanism to know where
                it is at power-up.
              </NoteBox>
              <p>
                Reading all of these in code —{" "}
                <code>DigitalChannel</code>, <code>TouchSensor</code>,{" "}
                <code>NormalizedColorSensor</code>, <code>DistanceSensor</code>{" "}—
                is covered with full examples on the{" "}
                <Link href="/docs/rev-robotics#sensors-deep-dive" className="link-accent">
                  REV Robotics page
                </Link>
                , and goBILDA&apos;s Pinpoint on the{" "}
                <Link href="/docs/gobilda#odometry-pods" className="link-accent">
                  goBILDA page
                </Link>
                .
              </p>
            </Prose>
          ),
        },
        {
          id: "expansion-hub",
          title: "Adding an Expansion Hub",
          content: (
            <Prose>
              <p>
                A second hub doubles your ports, and the rules allow at most{" "}
                <strong>two hubs on a robot</strong>. Add one when you have run
                out of sensor ports or I²C buses, or when a mechanism at the far
                end of the robot would otherwise need a very long wire run back to
                the Control Hub.
              </p>
              <NoteBox type="info">
                A second hub does not let you drive more motors. The eight-motor,
                eight-servo ceiling is a robot rule, not a port count — a second
                hub gives you somewhere to plug things in, not permission to add
                actuators.
              </NoteBox>
              <p>
                Chaining them takes two cables: an <strong>XT30 extension</strong>{" "}
                carrying 12 V from a spare power port on the Control Hub to a power
                port on the Expansion Hub, and a <strong>3-pin JST-PH cable</strong>{" "}
                between an RS485 port on each. It does not matter which of the two
                RS485 ports you use on either hub.
              </p>
              <StepList
                steps={[
                  "With both hubs unpowered, run the XT30 extension between a power port on each hub.",
                  "Run the 3-pin cable between an RS485 port on each hub — either port works.",
                  "Reconnect the battery and main switch, then power on.",
                  "On the Driver Station, choose Configure Robot. Press New for a fresh file, or edit your existing one and press Scan to pick up the new hub.",
                  "The Robot Controller shows the directly-connected device as a Control Hub \"Portal\". Open it and you should see both hubs listed underneath.",
                  "Configure the new hub's ports exactly as you did the first, then save.",
                ]}
              />
              <p>
                Every Expansion Hub ships set to address 2, and for the usual
                Control Hub plus one Expansion Hub you never need to think about
                that. It only becomes a problem for teams running{" "}
                <em>two</em>{" "}Expansion Hubs from a phone: both arrive at address 2,
                they collide, and one silently fails to appear. The fix is to
                connect one hub on its own and change its address under{" "}
                <strong>Settings → Advanced Settings → Expansion Hub Address
                Change</strong> before chaining the second one in.
              </p>
              <p>
                <strong>Port numbers do not continue across hubs.</strong>{" "}The
                second hub&apos;s motor ports are 0 to 3 all over again, its servo
                ports 0 to 5, its digital channels 0 to 7. There is no such thing
                as motor port 7. What tells the two apart is the configuration
                tree, not the number:
              </p>
              <Figure caption="Each hub is its own branch under the Portal. A device is identified by which hub it sits under plus which port it uses — but your code only ever sees the name.">
                <TwoHubConfigDiagram />
              </Figure>
              <NoteBox type="warning">
                Because names are global across both hubs, duplicates become a
                real hazard the moment you add a second hub. If both hubs end up
                with something called <code>lift_motor</code>, you have no way to
                say which one you meant. Name devices after what they do, and keep
                every name on the robot unique.
              </NoteBox>
              <p>
                <strong>Check your work before you power on.</strong>{" "}Walk the
                robot once with the switch off: give every connector a smart tug,
                confirm each motor&apos;s encoder cable is in the matching
                numbered port, look for any wire crossing a moving joint without
                slack, and confirm nothing is pinched under a mechanism. Then
                check that the main switch is genuinely off before the battery
                goes on.
              </p>
              <p>
                <strong>The first power-on is a diagnostic.</strong>{" "}The status
                LED tells you what the hub thinks is happening before you have
                written a line of code:
              </p>
              <SpecTable
                rows={[
                  { label: "Solid green", value: "Healthy", note: "Powered and talking to the Robot Controller" },
                  { label: "Solid blue", value: "Waiting", note: "Powered, but no connection yet — normal at boot" },
                  { label: "Blinking blue", value: "Lost contact", note: "Clears when communication resumes" },
                  { label: "Blinking orange", value: "Low battery", note: "Under 7 V — charge it" },
                ]}
              />
              <NoteBox type="tip">
                On an Expansion Hub, healthy looks like solid green punctuated by
                blue blinks every few seconds — and the{" "}
                <strong>number of blue blinks is the hub&apos;s address</strong>,
                so a factory-default hub blinks twice. That is the fastest way to
                confirm two chained hubs really are on different addresses: watch
                them blink.
              </NoteBox>
              <NoteBox type="info">
                If a Control Hub sits on solid blue for more than about thirty
                seconds, the Robot Controller is not talking to the hub&apos;s I/O
                side. That is a software-version problem rather than a wiring
                one — update everything to the current release.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "config-and-code",
          title: "Configuration & Your Code",
          content: (
            <Prose>
              <p>
                This is where the wiring becomes software, and it is where more
                teams lose an afternoon than anywhere else on this page. The
                reason is simple and slightly cruel: the name you typed on a
                touchscreen is a <em>string</em> your Java asks for by hand, and
                nothing checks that the two agree until the OpMode is already
                running on the robot. There is no compile error. There is no red
                underline in Android Studio. The code builds, deploys, and then
                fails at INIT.
              </p>
              <Figure caption="Three places, one name. The configuration and the Java string have to be identical.">
                <ConfigToCodeDiagram />
              </Figure>
              <p>
                <strong>Let&apos;s do one for real.</strong>{" "}Say you have a
                drivetrain motor and you want to drive it.
              </p>
              <StepList
                steps={[
                  "Plug the motor's power lead into motor port 0 on the Control Hub, and its encoder cable into encoder port 0 beside it.",
                  "Power on, connect the Driver Station, and choose Configure Robot.",
                  "Press New, then open the Control Hub Portal and select the Control Hub itself.",
                  "Touch Motors. You get a row for each of the four ports.",
                  "In the row for port 0, use the dropdown to pick the motor you actually installed.",
                  "In the name field for port 0, type front_left — exactly that, lowercase, with the underscore.",
                  "Press Done to back out of each screen until you reach the top, then press Save and give the file a name.",
                  "Back on the Driver Station's main screen, confirm your file is the one shown as active.",
                ]}
              />
              <p>
                Now, in your OpMode, you ask for that motor by the same string:
              </p>
              <CodeBlock
                filename="FirstMotorTest.java"
                code={`@TeleOp(name = "Motor Wiring Test")
public class FirstMotorTest extends LinearOpMode {

    @Override
    public void runOpMode() {
        // "front_left" here must be identical to the name in the config.
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "front_left");

        telemetry.addLine("Found front_left — config and code agree");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            // Gentle power so you can watch the encoder move.
            frontLeft.setPower(gamepad1.left_stick_y * -0.3);

            // If this number never changes while the motor turns,
            // the encoder cable is the problem, not the config.
            telemetry.addData("Encoder", frontLeft.getCurrentPosition());
            telemetry.update();
        }
    }
}`}
              />
              <p>
                If the name matches, the motor moves and the encoder count climbs.
                If it does not, you get this on the Driver Station the instant you
                press INIT:
              </p>
              <pre className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
{`java.lang.IllegalArgumentException: Unable to find a hardware device with name "front_left" and type DcMotor`}
              </pre>
              <p>
                <strong>Read that message literally — it hands you both halves of
                the problem.</strong> The text in quotes is exactly what your code
                asked for, character for character. The word after{" "}
                <em>type</em>{" "}is the class you requested. Before you change a line
                of Java, open the configuration and compare both against what is
                actually there.
              </p>
              <p>
                <strong>Then work down this list.</strong>{" "}Nearly every occurrence
                is one of five things:
              </p>
              <p>
                <strong>A typo.</strong>{" "}<code>frontleft</code> versus{" "}
                <code>front_left</code>, a missing underscore, a hyphen where you
                meant an underscore, or an abbreviation in one place and not the
                other. Read the quoted name in the error against the config
                character by character rather than glancing at it.
              </p>
              <p>
                <strong>Capitalisation.</strong>{" "}The lookup is case-sensitive.{" "}
                <code>frontLeft</code>{" "}and <code>front_left</code> are two
                completely different devices as far as the SDK is concerned, and
                mixing your Java variable name into the string is an easy way to
                do this by accident.
              </p>
              <p>
                <strong>The wrong type.</strong>{" "}The name exists, but not as the
                class you asked for — you configured the port as a Continuous
                Rotation Servo and your code asks for <code>Servo.class</code>, or
                the other way round. Confusingly, this produces the{" "}
                <em>same</em>{" "}error message as a name that does not exist at all,
                which is why the type at the end of the message is worth reading.
              </p>
              <p>
                <strong>The wrong configuration is active.</strong>{" "}Saving a
                configuration file does not make it the active one. If you created
                a new file but the Driver Station is still running last
                season&apos;s, none of your names exist. Check the active
                configuration on the Driver Station main screen.
              </p>
              <p>
                <strong>It was never saved.</strong>{" "}Typing a name into the
                configuration screen does not commit it. You have to press{" "}
                <strong>Done</strong>{" "}back up to the top level, press{" "}
                <strong>Save</strong>, and name the file. Backing out with the
                Android back button loses the lot.
              </p>
              <NoteBox type="tip">
                Whitespace behaves asymmetrically, which catches people. The SDK
                trims the string you pass in code, so{" "}
                <code>&quot;front_left &quot;</code>{" "}in Java still works — but a
                trailing space typed into the <em>configuration</em> is part of
                the device name and will never match. If a name looks
                letter-perfect and still fails, delete it in the configuration and
                retype it rather than re-reading your Java.
              </NoteBox>
              <DocVideo docSlug="wiring-configuration" sectionId="config-and-code" />
              <p>
                <strong>Naming conventions save you from all of this.</strong>{" "}
                Nothing enforces a style, so pick one and hold the team to it. The
                examples across this documentation use{" "}
                <code>snake_case</code>{" "}for config names and{" "}
                <code>camelCase</code>{" "}for the Java variables that hold them,
                which keeps the two visually distinct — when you see quotes and
                underscores, you are looking at a string that has to match
                hardware.
              </p>
              <SpecTable
                rows={[
                  { label: "front_left", value: "Drivetrain motor", note: "with front_right, back_left, back_right" },
                  { label: "imu", value: "Built-in IMU", note: "conventional name, keep it lowercase" },
                  { label: "lift_motor", value: "Mechanism motor", note: "subsystem first, then role" },
                  { label: "claw_servo", value: "Standard servo" },
                  { label: "intake_roller", value: "CRServo" },
                  { label: "touch_limit", value: "Limit switch", note: "on a digital channel" },
                  { label: "intake_color", value: "I²C colour sensor" },
                  { label: "pinpoint", value: "I²C odometry computer" },
                ]}
              />
              <p>
                Three habits prevent most of these bugs outright. Name devices by{" "}
                <strong>what they do, never by where they are plugged in</strong>{" "}
                — <code>lift_motor</code> rather than <code>motor2</code>, so
                moving a wire never forces a code change. Keep every name on the
                robot unique, especially across two hubs. And pull every{" "}
                <code>hardwareMap.get()</code>{" "}call into one place, so there is
                exactly one file to check when a name changes:
              </p>
              <CodeBlock
                filename="RobotHardware.java"
                code={`/**
 * Every config name on the robot, in one file. When a name changes in
 * the Driver Station, this is the only file that has to change with it.
 */
public class RobotHardware {

    public DcMotor frontLeft, frontRight, backLeft, backRight;
    public DcMotor lift;
    public Servo   claw;
    public IMU     imu;

    public void init(HardwareMap hardwareMap) {
        // ── Control Hub, motor ports 0-3 ─────────────────────────────────
        frontLeft  = hardwareMap.get(DcMotor.class, "front_left");
        frontRight = hardwareMap.get(DcMotor.class, "front_right");
        backLeft   = hardwareMap.get(DcMotor.class, "back_left");
        backRight  = hardwareMap.get(DcMotor.class, "back_right");

        // ── Expansion Hub, motor port 0 and servo port 0 ─────────────────
        lift = hardwareMap.get(DcMotor.class, "lift_motor");
        claw = hardwareMap.get(Servo.class,   "claw_servo");

        // ── Built-in IMU — always I2C bus 0, port 0 ──────────────────────
        imu = hardwareMap.get(IMU.class, "imu");

        // Mounting facts, corrected once, in one place.
        frontLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        backLeft.setDirection(DcMotorSimple.Direction.REVERSE);
        lift.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
    }
}`}
              />
              <NoteBox type="tip">
                For hardware that might not be plugged in — a sensor you are still
                prototyping with — <code>hardwareMap.tryGet()</code> returns{" "}
                <code>null</code>{" "}instead of throwing, so a missing device
                degrades one feature rather than taking the whole OpMode down at
                INIT.
              </NoteBox>
              <NoteBox type="info">
                Moved from a phone Robot Controller to a Control Hub and your IMU
                code stopped working? Asking for the old <code>BNO055</code>{" "}
                interface on a Control Hub logs a warning telling you to switch to
                the modern <code>IMU</code> interface. That one is a driver
                mismatch rather than a naming mismatch — the fix is in your code,
                not in the configuration.
              </NoteBox>
              <NoteBox type="tip">
                Build one habit for competition day: before each event, open the
                active configuration, read each port and name off the screen, and
                check them against the <code>hardwareMap.get()</code> calls in your
                init method. It takes two minutes and it catches the single most
                common reason a perfectly-built robot sits still at INIT.
              </NoteBox>
            </Prose>
          ),
        },
        {
          id: "further-reading",
          title: "Further Reading",
          content: (
            <Prose>
              <p>
                This page is deliberately practical, so the exhaustive numbers —
                every current limit, every approved part number, the per-pin
                signal diagrams — live in the sources below. When a figure matters
                to a design decision, go to the primary source, and treat the
                Competition Manual as authoritative over everything else including
                this page.
              </p>
              <p>
                <strong>Rules — the final word on anything legal</strong>
              </p>
              <ul className="my-3 space-y-1.5 text-sm text-slate-400">
                <li>
                  <a
                    href="https://ftc-resources.firstinspires.org/ftc/game/manual"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    FIRST Tech Challenge Competition Manual
                  </a>{" "}
                  — the approved battery, switch, and grounding-strap lists, the
                  wire gauge and colour requirements, the motor and servo limits,
                  and the rules on how hubs may be powered. Section 12 covers all
                  of it.
                </li>
              </ul>
              <p>
                <strong>Wiring diagrams and port photographs</strong>
              </p>
              <ul className="my-3 space-y-1.5 text-sm text-slate-400">
                <li>
                  <a
                    href="https://docs.revrobotics.com/duo-control/menu/control-hub-gs/wiring-diagram"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    REV — Wiring Diagram
                  </a>{" "}
                  — a full sample robot wiring diagram, plus REV&apos;s own cable
                  management guidance
                </li>
                <li>
                  <a
                    href="https://ftc-docs.firstinspires.org/en/latest/control_hard_compon/rc_components/hub/ports/ch-ports.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    FIRST — Control Hub Ports
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://ftc-docs.firstinspires.org/en/latest/control_hard_compon/rc_components/hub/ports/exh-ports.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    Expansion Hub Ports
                  </a>{" "}
                  — labelled photographs of every connector block
                </li>
                <li>
                  <a
                    href="https://docs.revrobotics.com/duo-control/control-system-overview/port-pinouts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    REV — Port Pinouts
                  </a>{" "}
                  — per-pin signal diagrams, for when you are making your own cable
                </li>
                <li>
                  <a
                    href="https://info.firstinspires.org/hubfs/web/program/ftc/guide-robot-wiring.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    FIRST — Robot Wiring Guide (PDF)
                  </a>{" "}
                  — printable, good to keep in the pit
                </li>
              </ul>
              <p>
                <strong>Specifications and troubleshooting</strong>
              </p>
              <ul className="my-3 space-y-1.5 text-sm text-slate-400">
                <li>
                  <a
                    href="https://docs.revrobotics.com/duo-control/control-system-overview/control-hub-basics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    REV — Control Hub Specifications
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://docs.revrobotics.com/duo-control/control-system-overview/expansion-hub-basics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    Expansion Hub Specifications
                  </a>{" "}
                  — every voltage and current figure quoted on this page
                </li>
                <li>
                  <a
                    href="https://docs.revrobotics.com/duo-control/troubleshooting-the-control-system/led-blink-codes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    REV — Status LED Blink Codes
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://docs.revrobotics.com/duo-control/troubleshooting-the-control-system/control-hub-troubleshooting"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    Control Hub Troubleshooting
                  </a>{" "}
                  — brown-out symptoms and the XT30 pin repair procedure
                </li>
                <li>
                  <a
                    href="https://ftc-docs.firstinspires.org/en/latest/hardware_and_software_configuration/configuring/configuring_dual_hubs/configuring-dual-hubs.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent"
                  >
                    FIRST — Adding an Expansion Hub
                  </a>{" "}
                  — the full daisy-chain and address-change walkthrough
                </li>
              </ul>
              <p>
                <strong>On this site</strong>
              </p>
              <ul className="my-3 space-y-1.5 text-sm text-slate-400">
                <li>
                  <Link href="/docs/rev-robotics" className="link-accent">
                    REV Robotics
                  </Link>{" "}
                  — Control Hub setup video, sensor code, and the IMU
                </li>
                <li>
                  <Link href="/docs/motors-servos" className="link-accent">
                    Motors &amp; Servos
                  </Link>{" "}
                  — run modes, encoders, and the servo APIs in depth
                </li>
                <li>
                  <Link href="/docs/android-studio" className="link-accent">
                    Android Studio Setup
                  </Link>{" "}
                  — building and deploying the OpMode that reads this config
                </li>
              </ul>
            </Prose>
          ),
        },
      ]}
    />
  );
}
