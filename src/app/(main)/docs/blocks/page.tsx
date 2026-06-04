import type { Metadata } from "next";
import DocPageLayout from "@/components/DocPageLayout";
import CodeBlock from "@/components/CodeBlock";
import { NoteBox, Prose } from "@/components/DocPrimitives";
import { BLOCKS_DOC } from "@/data/blocksDoc";

export const metadata: Metadata = {
  title: "FTC Blocks Reference – FTC Programming Hub",
};

export default function BlocksReferencePage() {
  return (
    <DocPageLayout
      breadcrumbs={[
        { label: "Docs", href: "/docs/java-basics" },
        { label: "FTC Blocks Reference" },
      ]}
      title="FTC Blocks Reference"
      description="A quick-reference guide to every block available in the FTC Blocks visual editor — Motors, Servos, Sensors, Gamepad, Telemetry, and Math."
      badge="Beginner"
      badgeColor="blue"
      readingTime="10 min"
      sections={BLOCKS_DOC.map((category) => ({
        id: category.id,
        title: category.label,
        content: (
          <Prose>
            {category.id === "motors" && (
              <NoteBox type="tip">
                Always initialize motors in the <strong>init phase</strong>{" "}
                (before <code>waitForStart()</code>) and put{" "}
                <code>setPower()</code> calls inside the{" "}
                <code>while (opModeIsActive())</code> loop.
              </NoteBox>
            )}
            {category.id === "servos" && (
              <NoteBox type="info">
                A standard <strong>Servo</strong> uses{" "}
                <code>setPosition(0.0–1.0)</code> to move to an angle. A{" "}
                <strong>CRServo</strong> (continuous rotation) uses{" "}
                <code>setPower(−1.0 to 1.0)</code> to spin like a motor — the
                two types are not interchangeable.
              </NoteBox>
            )}
            {category.id === "gamepad" && (
              <NoteBox type="tip">
                FTC gamepad Y-axes are <strong>inverted</strong> — pushing the
                stick fully forward returns <code>−1.0</code>. Always negate the
                Y value when using it for forward drive power.
              </NoteBox>
            )}
            {category.id === "sensors" && (
              <NoteBox type="info">
                Sensor devices must be retrieved from{" "}
                <code>hardwareMap</code> during initialization, before{" "}
                <code>waitForStart()</code>, using the same name configured in
                the Driver Station robot configuration.
              </NoteBox>
            )}
            {category.id === "math" && (
              <NoteBox type="tip">
                Use the <strong>Deadzone</strong> block on every joystick axis to
                prevent motors from drifting when a stick rests slightly off
                center. A threshold of <code>0.05</code> is a safe starting
                point.
              </NoteBox>
            )}
            <div className="mt-4 space-y-6">
              {category.blocks.map((doc) => (
                <div
                  key={doc.name}
                  className="rounded-lg border border-slate-800/60 bg-slate-900/30 overflow-hidden"
                >
                  <div
                    className="px-4 py-2.5 border-b border-slate-800/60"
                    style={{ borderLeftColor: category.colour, borderLeftWidth: 3 }}
                  >
                    <p className="text-sm font-semibold text-slate-200">
                      {doc.name}
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-sm leading-relaxed text-slate-400">
                      {doc.description}
                    </p>
                    {doc.example && (
                      <CodeBlock
                        filename="Example"
                        code={doc.example}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Prose>
        ),
      }))}
    />
  );
}
