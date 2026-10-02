import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "vector-tiles-cache";
const UUID_RE = /^[0-9a-f-]{36}$/i;

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

function tileResponse(bytes: Uint8Array, cache: "HIT" | "MISS") {
  if (bytes.length === 0) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "public, max-age=3600", "X-Tile-Cache": cache },
    });
  }
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/x-protobuf",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Tile-Cache": cache,
    },
  });
}

// GET /api/public/vector-tile?z=&x=&y=&layer_id=
export const Route = createFileRoute("/api/public/vector-tile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const z = Number(url.searchParams.get("z"));
        const x = Number(url.searchParams.get("x"));
        const y = Number(url.searchParams.get("y"));
        const layerId = url.searchParams.get("layer_id") ?? "";
        if (
          !UUID_RE.test(layerId) ||
          ![z, x, y].every(Number.isInteger) ||
          z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z
        ) {
          return new Response("bad request", { status: 400 });
        }

        const path = `${layerId}/${z}/${x}/${y}.pbf`;

        // 1) Cache hit
        const cached = await supabaseAdmin.storage.from(BUCKET).download(path);
        if (cached.data) {
          return tileResponse(new Uint8Array(await cached.data.arrayBuffer()), "HIT");
        }

        // 2) Generate in PostGIS
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabaseAdmin as any).rpc("get_vector_tile_bin", {
          _layer_id: layerId, _z: z, _x: x, _y: y,
        });
        if (error) return new Response(error.message, { status: 500 });
        if (data == null) return new Response(null, { status: 204 }); // layer hidden: don't cache

        const bytes = hexToBytes(String(data));

        // 3) Save to cache (best effort)
        await supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: "application/x-protobuf", upsert: true })
          .catch(() => undefined);

        return tileResponse(bytes, "MISS");
      },
    },
  },
});
