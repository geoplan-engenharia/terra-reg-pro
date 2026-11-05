import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "vector-tiles-cache";
const UUID_RE = /^[0-9a-f-]{36}$/i;

// Navegador guarda 1h; cache da borda (Cloudflare) guarda 24h.
// A URL carrega `v` (versão da camada), então uma reimportação gera URLs novas
// e o cache antigo simplesmente deixa de ser usado.
const BROWSER_CACHE = "public, max-age=3600";
const EDGE_CACHE = "public, max-age=86400";

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

function tileResponse(bytes: Uint8Array, source: string, cacheControl = BROWSER_CACHE) {
  if (bytes.length === 0) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": cacheControl, "Access-Control-Allow-Origin": "*", "X-Tile-Cache": source },
    });
  }
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/x-protobuf",
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
      "X-Tile-Cache": source,
    },
  });
}

// Cache da borda do Cloudflare (existe só quando roda no Worker; em dev é ignorado).
function edgeCache(): Cache | null {
  try {
    const c = (globalThis as unknown as { caches?: { default?: Cache } }).caches;
    return c?.default ?? null;
  } catch {
    return null;
  }
}

async function readEdge(key: Request): Promise<Response | null> {
  const cache = edgeCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(key);
    if (!hit) return null;
    const body = new Uint8Array(await hit.arrayBuffer());
    return tileResponse(body, "EDGE");
  } catch {
    return null;
  }
}

async function writeEdge(key: Request, bytes: Uint8Array) {
  const cache = edgeCache();
  if (!cache) return;
  try {
    await cache.put(key, tileResponse(bytes, "EDGE", EDGE_CACHE));
  } catch {
    /* best effort */
  }
}

// GET /api/public/vector-tile?z=&x=&y=&layer_id=&v=
export const Route = createFileRoute("/api/public/vector-tile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const z = Number(url.searchParams.get("z"));
        const x = Number(url.searchParams.get("x"));
        const y = Number(url.searchParams.get("y"));
        const layerId = url.searchParams.get("layer_id") ?? "";
        const version = (url.searchParams.get("v") ?? "0").replace(/[^0-9a-zA-Z]/g, "").slice(0, 32) || "0";
        if (
          !UUID_RE.test(layerId) ||
          ![z, x, y].every(Number.isInteger) ||
          z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z
        ) {
          return new Response("bad request", { status: 400 });
        }

        // Chave canônica: ignora parâmetros extras para não fragmentar o cache.
        const edgeKey = new Request(
          `${url.origin}/__tiles/${layerId}/${version}/${z}/${x}/${y}.pbf`,
          { method: "GET" },
        );

        // 1) Cache da borda (mais rápido, fica perto do usuário)
        const edgeHit = await readEdge(edgeKey);
        if (edgeHit) return edgeHit;

        const path = `${layerId}/${z}/${x}/${y}.pbf`;

        // 2) Cache no storage do Supabase
        const cached = await supabaseAdmin.storage.from(BUCKET).download(path);
        if (cached.data) {
          const bytes = new Uint8Array(await cached.data.arrayBuffer());
          await writeEdge(edgeKey, bytes);
          return tileResponse(bytes, "STORAGE");
        }

        // 3) Gera no PostGIS
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabaseAdmin as any).rpc("get_vector_tile_bin", {
          _layer_id: layerId, _z: z, _x: x, _y: y,
        });
        if (error) return new Response(error.message, { status: 500 });
        if (data == null) return new Response(null, { status: 204 }); // camada oculta: não cachear

        const bytes = hexToBytes(String(data));

        // Guarda na borda (rápido) e no storage em segundo plano, sem segurar a resposta.
        await writeEdge(edgeKey, bytes);
        void supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: "application/x-protobuf", upsert: true })
          .catch(() => undefined);

        return tileResponse(bytes, "MISS");
      },
    },
  },
});
