import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      {/* Offset para a sidebar fixa */}
      <main className="ml-64 flex-1 min-w-0">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
