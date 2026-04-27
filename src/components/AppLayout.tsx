import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { RequireAuth } from "./RequireAuth";

export function AppLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <AppHeader title={title} subtitle={subtitle} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
