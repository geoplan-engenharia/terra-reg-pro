import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Leaf } from "lucide-react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-12 w-12 rounded-md bg-gradient-primary grid place-items-center shadow-glow animate-pulse">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xs">Carregando…</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
