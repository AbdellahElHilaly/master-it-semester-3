import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = join(root, "public");
const dataRoot = join(root, ".data");
const databasePath = join(dataRoot, "documentation.sqlite");
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
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light')").run();

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};

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
    let body = "";
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body || "{}");
    if (payload.theme !== "light" && payload.theme !== "quiet") return json(response, 400, { error: "Unsupported theme" });
    db.prepare("INSERT INTO settings (key, value) VALUES ('theme', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(payload.theme);
    return json(response, 200, { ok: true, theme: payload.theme });
  }
  if (url.pathname === "/api/samples" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body || "{}");
    if (!payload.title || !payload.module_slug) return json(response, 400, { error: "title and module_slug are required" });
    const result = db.prepare("INSERT INTO samples (module_slug, title, kind) VALUES (?, ?, ?)").run(payload.module_slug, payload.title, payload.kind || "practice");
    return json(response, 201, { ok: true, id: Number(result.lastInsertRowid) });
  }
  if (request.method === "GET" && serveStatic(response, url.pathname)) return;
  json(response, 404, { error: "Not found" });
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => console.log(`Documentation app: http://127.0.0.1:${port}`));
