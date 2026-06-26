import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import WorkspaceCookieSync from "@/components/WorkspaceCookieSync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | FTC Programming Hub",
    default: "FTC Programming Hub",
  },
  description:
    "FIRST Tech Challenge programming tutorials, documentation, and coding challenges.",
  verification: {
    google: "4dQld-gjcfwQ6J8Zm_K68XtbIC36RDx_4f3-j-XPYTw",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full bg-slate-950 text-slate-100 antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <WorkspaceCookieSync />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
