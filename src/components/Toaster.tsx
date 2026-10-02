import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="system"
      toastOptions={{
        className: "!bg-card !border-border !text-foreground",
      }}
    />
  );
}
