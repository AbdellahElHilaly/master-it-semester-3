const panels = [...document.querySelectorAll(".section-panel")];
const links = [...document.querySelectorAll(".nav-link")];
const themeButton = document.querySelector("#themeToggle");
const moduleList = document.querySelector("#moduleList");
const status = document.querySelector("#saveStatus");

function showSection(id) {
  panels.forEach(panel => panel.classList.toggle("active-panel", panel.id === id));
  links.forEach(link => link.classList.toggle("active", link.dataset.section === id));
  history.replaceState(null, "", `#${id}`);
}

links.forEach(link => link.addEventListener("click", () => showSection(link.dataset.section)));

themeButton.addEventListener("click", async () => {
  const theme = document.body.classList.toggle("quiet") ? "quiet" : "light";
  themeButton.textContent = theme === "quiet" ? "Theme · calme" : "Theme · نمط";
  await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme }) });
});

function renderModules(modules) {
  moduleList.innerHTML = modules.map(module => `
    <div class="module-row">
      <b>${module.title_fr}</b>
      <small dir="rtl">${module.title_ar} · ${module.status}</small>
    </div>`).join("");
}

async function loadConfig() {
  const response = await fetch("/api/config");
  const data = await response.json();
  renderModules(data.modules);
  if (data.settings.theme === "quiet") {
    document.body.classList.add("quiet");
    themeButton.textContent = "Theme · calme";
  }
}

document.querySelector("#savePractice").addEventListener("click", async () => {
  await fetch("/api/samples", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module_slug: "programmation-concurrente-parallele", title: "PAR basics practice", kind: "practice" }) });
  status.textContent = "Saved in SQLite · تم الحفظ في SQLite";
});

showSection(location.hash.slice(1) || "study");
loadConfig().catch(error => { status.textContent = `SQLite unavailable: ${error.message}`; });
