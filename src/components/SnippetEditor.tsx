"use client";

import dynamic from "next/dynamic";
import { defineFtcMonacoThemes } from "@/lib/monacoThemes";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#18181f]">
      <div className="text-xs text-slate-600">Loading editor…</div>
    </div>
  ),
});

export default function SnippetEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <MonacoEditor
      height="100%"
      language="java"
      theme="ftc-dark"
      value={value}
      onChange={(val) => onChange(val ?? "")}
      onMount={(_editor, monaco) => {
        defineFtcMonacoThemes(monaco);
        monaco.editor.setTheme("ftc-dark");
      }}
      options={{
        fontSize: 13,
        fontFamily:
          "'Geist Mono', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
        fontLigatures: true,
        lineNumbers: "on",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 4,
        insertSpaces: true,
        folding: true,
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        renderLineHighlight: "gutter",
        padding: { top: 12, bottom: 12 },
        overviewRulerLanes: 0,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
        lineDecorationsWidth: 4,
        suggest: { showWords: true },
      }}
    />
  );
}
