import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const MapaInterativo = lazy(() =>
  import("./MapaInterativo").then((m) => ({ default: m.MapaInterativo }))
);

export function MapaClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-full w-full grid place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando mapa...
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-full w-full grid place-items-center bg-background">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando mapa...
          </div>
        </div>
      }
    >
      <MapaInterativo />
    </Suspense>
  );
}
