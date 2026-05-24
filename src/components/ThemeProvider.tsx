"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { getAccent, applyAccent } from "@/lib/accent";

function AccentInitializer() {
  useEffect(() => {
    applyAccent(getAccent());
  }, []);
  return null;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      themes={["dark", "midnight", "light", "paper"]}
      enableSystem={false}
    >
      <AccentInitializer />
      {children}
    </NextThemesProvider>
  );
}
