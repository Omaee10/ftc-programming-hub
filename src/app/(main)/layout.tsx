import AppShell from "@/components/AppShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
      <AppShell>{children}</AppShell>
    </div>
  );
}
