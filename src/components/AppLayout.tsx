import { type ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { RequireAuth } from "./RequireAuth";
import { TrialBanner } from "./TrialBanner";
import { OnboardingModal } from "./OnboardingModal";
import { useOnboardingProgress } from "@/lib/trial";
import { useAuth } from "@/lib/auth";

function OnboardingHost({ openSignal }: { openSignal: number }) {
  const { user } = useAuth();
  const progress = useOnboardingProgress();
  const [open, setOpen] = useState(false);
  const [autoChecked, setAutoChecked] = useState(false);

  // Auto-abrir uma vez por sessão se onboarding não dispensado e não completo
  useEffect(() => {
    if (!user || autoChecked || !progress.data) return;
    const d = progress.data;
    const completed =
      d.has_created_client && d.has_created_property && d.has_run_diagnosis && d.has_generated_report;
    if (!d.onboarding_dismissed && !completed) {
      const sessionKey = `geoterra_onboarding_seen_${user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        setOpen(true);
        sessionStorage.setItem(sessionKey, "1");
      }
    }
    setAutoChecked(true);
  }, [user, progress.data, autoChecked]);

  // Reabrir manualmente via botão "Tutorial"
  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  return <OnboardingModal open={open} onClose={() => setOpen(false)} />;
}

export function AppLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [tutorialSignal, setTutorialSignal] = useState(0);
  return (
    <RequireAuth>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <TrialBanner />
          <AppHeader title={title} subtitle={subtitle} onOpenTutorial={() => setTutorialSignal((s) => s + 1)} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <OnboardingHost openSignal={tutorialSignal} />
      </div>
    </RequireAuth>
  );
}
