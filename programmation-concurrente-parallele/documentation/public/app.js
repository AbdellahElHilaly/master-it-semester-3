const panels = [...document.querySelectorAll(".section-panel")];
const links = [...document.querySelectorAll(".section-link")];
const title = document.querySelector("#toolbarTitle");
const moduleList = document.querySelector("#moduleList");
const status = document.querySelector("#saveStatus");
const drawer = document.querySelector("#chatDrawer");
const messages = document.querySelector("#chatMessages");
const chatInput = document.querySelector("#chatInput");
const chatStatus = document.querySelector("#chatStatus");
const grokConfig = document.querySelector("#grokConfig");
const labels = { study: "Study · Leçon", vocabulary: "Vocabulary · Termes", practice: "Practice · Exécuter", roadmap: "Modules · Semestre" };
const themeOrder = ["graphite", "paper", "webapi"];

function showSection(id) {
  const target = panels.some(panel => panel.id === id) ? id : "study";
  panels.forEach(panel => panel.classList.toggle("active-panel", panel.id === target));
  links.forEach(link => link.classList.toggle("active", link.dataset.section === target));
  title.textContent = labels[target];
  history.replaceState(null, "", `#${target}`);
}

function plainText(value) {
  return String(value || "").replace(/```[\s\S]*?```/g, "").replace(/<[^>]*>/g, "").replace(/^\s*[-#*>]+\s?/gm, "").trim();
}

function addChatMessage(kind, value, canSendToStudy = false) {
  const message = document.createElement("div");
  message.className = `chat-message ${kind}`;
  message.textContent = plainText(value);
  messages.querySelector(".chat-empty")?.remove();
  messages.append(message);
  if (canSendToStudy) {
    const actions = document.createElement("div");
    actions.className = "chat-actions";
    const send = document.createElement("button");
    send.className = "btn primary";
    send.type = "button";
    send.textContent = "Show in Study · عرض في الدرس";
    send.addEventListener("click", () => showStudyNote(message.textContent));
    actions.append(send);
    messages.append(actions);
  }
  messages.scrollTop = messages.scrollHeight;
}

function showStudyNote(value) {
  const note = document.querySelector("#assistantNote");
  const text = document.querySelector("#assistantNoteText");
  text.replaceChildren();
  plainText(value).split(/\n{2,}/).forEach(part => {
    if (!part.trim()) return;
    const paragraph = document.createElement("p");
    paragraph.textContent = part.trim();
    text.append(paragraph);
  });
  note.classList.remove("hidden");
  showSection("study");
  drawer.classList.add("hidden");
}

async function sendGrokMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  addChatMessage("user", message);
  chatInput.value = "";
  chatStatus.textContent = "Grok is thinking…";
  try {
    const response = await fetch("/api/grok/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Grok request failed.");
    addChatMessage("assistant", data.text, true);
    chatStatus.textContent = "";
  } catch (error) {
    chatStatus.textContent = error.message;
  }
}

links.forEach(link => link.addEventListener("click", () => showSection(link.dataset.section)));
document.querySelector("#sidebarToggle").addEventListener("click", () => document.body.classList.toggle("sidebar-hidden"));
document.querySelector("#chatToggle").addEventListener("click", () => drawer.classList.toggle("hidden"));
document.querySelector("#chatClose").addEventListener("click", () => drawer.classList.add("hidden"));
document.querySelector("#settingsToggle").addEventListener("click", () => document.querySelector("#settingsPop").classList.toggle("hidden"));
document.querySelector("#fullscreenToggle").addEventListener("click", async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.querySelector(".app-shell").requestFullscreen();
});
document.querySelector("#themeToggle").addEventListener("click", async () => {
  const current = document.body.dataset.theme;
  const theme = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length];
  document.body.dataset.theme = theme;
  await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme }) });
});
document.querySelector("#chatSend").addEventListener("click", sendGrokMessage);
chatInput.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendGrokMessage(); } });

function renderModules(modules) { moduleList.innerHTML = modules.map(module => `<div class="module-row"><b>${module.title_fr}</b><small>${module.title_ar} · ${module.status}</small></div>`).join(""); }
async function loadConfig() {
  const [configResponse, grokResponse] = await Promise.all([fetch("/api/config"), fetch("/api/grok/status")]);
  const data = await configResponse.json();
  const grok = await grokResponse.json();
  renderModules(data.modules);
  document.body.dataset.theme = themeOrder.includes(data.settings.theme) ? data.settings.theme : "graphite";
  grokConfig.textContent = grok.configured ? `Grok ready · ${grok.model}` : "Grok needs XAI_API_KEY in the launcher service.";
}
document.querySelector("#savePractice").addEventListener("click", async () => {
  const response = await fetch("/api/samples", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module_slug: "programmation-concurrente-parallele", title: "PAR basics practice", kind: "practice" }) });
  status.textContent = response.ok ? "Saved in SQLite · تم الحفظ في SQLite" : "Could not save the note.";
});
showSection(location.hash.slice(1));
loadConfig().catch(error => { status.textContent = `SQLite unavailable: ${error.message}`; });
