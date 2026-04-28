import { type ReactNode } from "react";
import { Lock } from "lucide-react";
import { useTrialStatus } from "@/lib/trial";
import { toast } from "sonner";

const BLOCK_MSG = "Seu período de teste expirou. Escolha um plano para continuar.";

/**
 * Wrapper que bloqueia ações quando o trial expirou (ou plano inativo).
 * - Se bloqueado: intercepta o clique, mostra toast e adiciona ícone de cadeado.
 * - Caso contrário: renderiza o filho normalmente.
 */
export function TrialGuard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const trial = useTrialStatus();
  if (!trial.isBlocked) return <>{children}</>;
  return (
    <div
      className={className}
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toast.error(BLOCK_MSG);
      }}
      title={BLOCK_MSG}
    >
      <div className="relative inline-flex opacity-60 pointer-events-none">
        {children}
        <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-destructive text-destructive-foreground">
          <Lock className="h-2.5 w-2.5" />
        </span>
      </div>
    </div>
  );
}

/** Hook simples para checar e abortar uma ação imperativa. Retorna true se está bloqueado. */
export function useGuardTrial() {
  const trial = useTrialStatus();
  return () => {
    if (trial.isBlocked) {
      toast.error(BLOCK_MSG);
      return true;
    }
    return false;
  };
}
