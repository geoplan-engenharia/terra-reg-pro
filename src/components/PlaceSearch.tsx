import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlaceResult = {
  display_name: string;
  lat: number;
  lon: number;
  bbox?: [number, number, number, number]; // south, north, west, east
  type?: string;
};

type NominatimItem = {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
  type?: string;
  class?: string;
  place_id: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    state_code?: string;
    "ISO3166-2-lvl4"?: string;
    country?: string;
  };
};

const UF_MAP: Record<string, string> = {
  Acre: "AC", Alagoas: "AL", Amapá: "AP", Amazonas: "AM", Bahia: "BA", Ceará: "CE",
  "Distrito Federal": "DF", "Espírito Santo": "ES", Goiás: "GO", Maranhão: "MA",
  "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", Pará: "PA",
  Paraíba: "PB", Paraná: "PR", Pernambuco: "PE", Piauí: "PI", "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", Rondônia: "RO", Roraima: "RR",
  "Santa Catarina": "SC", "São Paulo": "SP", Sergipe: "SE", Tocantins: "TO",
};

function formatPlaceLabel(item: NominatimItem): string {
  const a = item.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county;
  const stateName = a.state;
  const iso = a["ISO3166-2-lvl4"];
  const uf = (iso?.split("-")[1]) ?? (stateName ? UF_MAP[stateName] : undefined);
  // Estado puro (sem cidade)
  if (!city && stateName) return uf ? `${stateName} (${uf})` : stateName;
  if (city && uf) return `${city}, ${uf}`;
  if (city && stateName) return `${city}, ${stateName}`;
  return city ?? stateName ?? item.display_name.split(",")[0];
}

export function PlaceSearch({
  onSelect,
  className,
}: {
  onSelect: (place: PlaceResult) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", q);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "15");
        url.searchParams.set("countrycodes", "br");
        url.searchParams.set("accept-language", "pt-BR");
        // Restringe a municípios e estados
        url.searchParams.set("featuretype", "settlement");
        const res = await fetch(url.toString(), {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as (NominatimItem & {
          class?: string;
          type?: string;
          address?: { city?: string; town?: string; village?: string; municipality?: string; state?: string; country?: string };
        })[];
        // Filtra apenas municípios (city/town/village/municipality) e estados
        const filtered = data.filter((d) => {
          const t = d.type ?? "";
          const c = d.class ?? "";
          return (
            c === "boundary" ||
            ["city", "town", "village", "municipality", "administrative", "state"].includes(t)
          );
        }).slice(0, 8);
        setResults(filtered);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (item: NominatimItem) => {
    const place: PlaceResult = {
      display_name: item.display_name,
      lat: Number(item.lat),
      lon: Number(item.lon),
      bbox: item.boundingbox
        ? [
            Number(item.boundingbox[0]),
            Number(item.boundingbox[1]),
            Number(item.boundingbox[2]),
            Number(item.boundingbox[3]),
          ]
        : undefined,
      type: item.type,
    };
    onSelect(place);
    setQuery(item.display_name.split(",").slice(0, 2).join(","));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar município ou estado..."
          className="h-9 w-full rounded-md border border-input bg-input/40 pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent/20"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : null}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-panel max-h-72 overflow-auto z-[1000]">
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 border-b border-border last:border-b-0 flex items-start gap-2"
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {open && !loading && query.trim().length >= 3 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-panel z-[1000] px-3 py-2 text-xs text-muted-foreground">
          Nenhum local encontrado.
        </div>
      )}
    </div>
  );
}
