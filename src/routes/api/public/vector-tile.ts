import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Verificação do login por tile, sem chamada de rede a cada tile:
// 1) tokens já validados ficam em memória até expirarem;
// 2) projetos com chaves assimétricas validam localmente via JWKS (jose);
// 3) projetos com chave legada (HS256) caem no auth do Supabase, uma vez por token.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const verified = new Map<string, number>(); // token -> expira em (ms)
const MAX_CACHED_TOKENS = 500;

function tokenExpMs(token: string): number {
  try {
    const part = token.split(".")[1] ?? "";
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function remember(token: string) {
  const exp = tokenExpMs(token) || Date.now() + 5 * 60_000;
  if (verified.size >= MAX_CACHED_TOKENS) {
    const now = Date.now();
    for (const [k, v] of verified) if (v <= now) verified.delete(k);
    if (verified.size >= MAX_CACHED_TOKENS) verified.clear();
  }
  verified.set(token, exp);
}

async function verifyUser(request: Request): Promise<boolean> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;

  const cachedExp = verified.get(token);
  if (cachedExp !== undefined) {
    if (cachedExp > Date.now()) return true;
    verified.delete(token);
  }

  const base = process.env.SUPABASE_URL;
  if (!base) return false;
  const issuer = `${base.replace(/\/$/, "")}/auth/v1`;

  // Caminho rápido: chave assimétrica, validada localmente.
  try {
    jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
      cacheMaxAge: 6 * 3600_000,
    });
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: "authenticated",
      algorithms: ["ES256", "RS256", "EdDSA"],
    });
    if (typeof payload.sub === "string") {
      remember(token);
      return true;
    }
  } catch {
    /* segue para o fallback */
  }

  // Fallback: chave legada ou JWKS indisponível — o Supabase valida o token.
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user?.id) {
      remember(token);
      return true;
    }
  } catch {
    /* inválido */
  }
  return false;
}

const BUCKET = "vector-tiles-cache";
const UUID_RE = /^[0-9a-f-]{36}$/i;

// Navegador guarda 1h; cache da borda (Cloudflare) guarda 24h.
// A URL carrega `v` (versão da camada), então uma reimportação gera URLs novas
// e o cache antigo simplesmente deixa de ser usado.
const BROWSER_CACHE = "private, max-age=3600";
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
        // Exige usuário logado antes de qualquer cache.
        if (!(await verifyUser(request))) {
          return new Response("unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
        }
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
