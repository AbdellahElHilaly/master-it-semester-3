const panels = [...document.querySelectorAll(".section-panel")];
const links = [...document.querySelectorAll(".section-link")];
const title = document.querySelector("#toolbarTitle");
const moduleList = document.querySelector("#moduleList");
const status = document.querySelector("#saveStatus");
const labels = { study: "Study · Leçon", vocabulary: "Vocabulary · Termes", practice: "Practice · Exécuter", roadmap: "Modules · Semestre" };
const themeOrder = ["graphite", "paper", "webapi"];
function showSection(id) { const target = panels.some(panel => panel.id === id) ? id : "study"; panels.forEach(panel => panel.classList.toggle("active-panel", panel.id === target)); links.forEach(link => link.classList.toggle("active", link.dataset.section === target)); title.textContent = labels[target]; history.replaceState(null, "", `#${target}`); }
links.forEach(link => link.addEventListener("click", () => showSection(link.dataset.section)));
document.querySelector("#sidebarToggle").addEventListener("click", () => document.body.classList.toggle("sidebar-hidden"));
document.querySelector("#themeToggle").addEventListener("click", async () => { const current = document.body.dataset.theme; const theme = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length]; document.body.dataset.theme = theme; await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme }) }); });
function renderModules(modules) { moduleList.innerHTML = modules.map(module => `<div class="module-row"><b>${module.title_fr}</b><small>${module.title_ar} · ${module.status}</small></div>`).join(""); }
async function loadConfig() { const response = await fetch("/api/config"); const data = await response.json(); renderModules(data.modules); document.body.dataset.theme = themeOrder.includes(data.settings.theme) ? data.settings.theme : "graphite"; }
document.querySelector("#savePractice").addEventListener("click", async () => { const response = await fetch("/api/samples", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module_slug: "programmation-concurrente-parallele", title: "PAR basics practice", kind: "practice" }) }); status.textContent = response.ok ? "Saved in SQLite · تم الحفظ في SQLite" : "Could not save the note."; });
showSection(location.hash.slice(1)); loadConfig().catch(error => { status.textContent = `SQLite unavailable: ${error.message}`; });
