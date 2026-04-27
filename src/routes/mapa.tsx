import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { MapaInterativo } from "@/components/MapaInterativo";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa Interativo — GeoTerra" },
      { name: "description", content: "Mapa de imóveis rurais com camadas geoespaciais." },
    ],
  }),
  component: MapaPage,
});

function MapaPage() {
  return (
    <AppLayout title="Mapa Interativo" subtitle="Clique em um imóvel para ver o relatório completo">
      <div className="h-[calc(100vh-4rem)] relative">
        <MapaInterativo />
      </div>
    </AppLayout>
  );
}
