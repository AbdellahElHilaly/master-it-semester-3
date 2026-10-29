import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = join(root, "public");
const dataRoot = join(root, ".data");
const databasePath = join(dataRoot, "documentation.sqlite");
const devUtilsConfig = join(process.env.USERPROFILE || "C:\\Users\\DELL", "src", "sami-worspace", "components", "dev-utils", "ai-config.json");
mkdirSync(dataRoot, { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS modules (
    slug TEXT PRIMARY KEY,
    title_fr TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned'
  );
  CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_slug TEXT NOT NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const seedModules = [
  ["programmation-concurrente-parallele", "Programmation concurrente et parallèle", "البرمجة المتزامنة والمتوازية", "active"],
  ["big-data", "Big Data", "البيانات الضخمة", "planned"],
  ["theorie-des-graphes", "Théorie des graphes", "نظرية الرسوم البيانية", "planned"],
  ["ingenierie-modeles-langages", "Ingénierie des modèles et des langages", "هندسة النماذج واللغات", "planned"],
  ["traitement-automatique-langues", "Traitement automatique des langues", "المعالجة الآلية للغات", "planned"],
  ["traitement-video", "Traitement de la vidéo", "معالجة الفيديو", "planned"],
  ["vision-ordinateur", "Vision par ordinateur", "الرؤية الحاسوبية", "planned"]
];
const insertModule = db.prepare("INSERT OR IGNORE INTO modules (slug, title_fr, title_ar, status) VALUES (?, ?, ?, ?)");
for (const module of seedModules) insertModule.run(...module);
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'graphite')").run();
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('provider', 'grok')").run();
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('model', 'latest')").run();

function groqProfile() {
  try {
    const config = JSON.parse(readFileSync(devUtilsConfig, "utf8"));
    const profile = config?.providers?.groq || {};
    return { key: process.env.GROQ_API_KEY || profile.apiKey || "", models: Array.isArray(profile.models) ? profile.models.map(model => typeof model === "string" ? model : model?.id).filter(Boolean) : [] };
  } catch { return { key: process.env.GROQ_API_KEY || "", models: [] }; }
}

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  try { return JSON.parse(body || "{}"); } catch { return null; }
}

function plainStudyText(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*[-#*>]+\s?/gm, "")
    .trim()
    .slice(0, 12000);
}

const staticTypes = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = normalize(join(publicRoot, requested));
  if (!file.startsWith(publicRoot + sep) || !existsSync(file)) return false;
  response.writeHead(200, { "Content-Type": `${staticTypes[extname(file)] || "text/plain"}; charset=utf-8` });
  response.end(readFileSync(file));
  return true;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/api/config" && request.method === "GET") {
    const modules = db.prepare("SELECT slug, title_fr, title_ar, status FROM modules ORDER BY rowid").all();
    const settings = Object.fromEntries(db.prepare("SELECT key, value FROM settings").all().map(row => [row.key, row.value]));
    const samples = db.prepare("SELECT id, module_slug, title, kind, completed FROM samples ORDER BY id DESC").all();
    return json(response, 200, { settings, modules, samples });
  }
  if (url.pathname === "/api/config" && request.method === "POST") {
    const payload = await readJson(request);
    if (!payload) return json(response, 400, { error: "Invalid JSON" });
    if (payload.theme && !["graphite", "paper", "webapi"].includes(payload.theme)) return json(response, 400, { error: "Unsupported theme" });
    for (const key of ["theme", "provider", "model"]) if (typeof payload[key] === "string") db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, payload[key]);
    return json(response, 200, { ok: true });
  }
  if (url.pathname === "/api/samples" && request.method === "POST") {
    const payload = await readJson(request);
    if (!payload) return json(response, 400, { error: "Invalid JSON" });
    if (!payload.title || !payload.module_slug) return json(response, 400, { error: "title and module_slug are required" });
    const result = db.prepare("INSERT INTO samples (module_slug, title, kind) VALUES (?, ?, ?)").run(payload.module_slug, payload.title, payload.kind || "practice");
    return json(response, 201, { ok: true, id: Number(result.lastInsertRowid) });
  }
  if (url.pathname === "/api/grok/status" && request.method === "GET") {
    const groq = groqProfile();
    return json(response, 200, { providers: { grok: { configured: Boolean(process.env.XAI_API_KEY), models: [process.env.XAI_MODEL || "latest"] }, groq: { configured: Boolean(groq.key), models: groq.models.length ? groq.models : ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "llama-3.3-70b-versatile"] } } });
  }
  if (url.pathname === "/api/grok/chat" && request.method === "POST") {
    const payload = await readJson(request);
    const message = plainStudyText(payload?.message);
    if (!message) return json(response, 400, { error: "A message is required." });
    const provider = payload?.provider === "groq" ? "groq" : "grok";
    const apiKey = provider === "groq" ? groqProfile().key : process.env.XAI_API_KEY;
    if (!apiKey) return json(response, 503, { error: provider === "groq" ? "Groq is not configured. Set GROQ_API_KEY before starting Documentation." : "Grok is not configured. Set XAI_API_KEY before starting Documentation." });
    try {
      const upstream = await fetch(provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: plainStudyText(payload?.model) || (provider === "groq" ? "openai/gpt-oss-20b" : process.env.XAI_MODEL || "latest"),
          messages: [
            { role: "system", content: "You are Grok inside a Master IT study notebook. Reply only as concise, readable learning text. French is primary; add a short Arabic explanation when useful. Never use HTML, Markdown, CSS, JavaScript, code blocks, or tags." },
            { role: "user", content: message }
          ]
        })
      });
      const result = await upstream.json();
      if (!upstream.ok) return json(response, upstream.status, { error: result?.error?.message || "Grok request failed." });
      return json(response, 200, { text: plainStudyText(result?.choices?.[0]?.message?.content) });
    } catch {
      return json(response, 502, { error: "Could not reach the Grok API." });
    }
  }
  if (request.method === "GET" && serveStatic(response, url.pathname)) return;
  json(response, 404, { error: "Not found" });
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => console.log(`Documentation app: http://127.0.0.1:${port}`));
