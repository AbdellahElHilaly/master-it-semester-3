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
let aiProvider = "grok";
let aiModel = "latest";

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
    const response = await fetch("/api/grok/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, provider: aiProvider, model: aiModel }) });
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
document.querySelector("#settingsClose").addEventListener("click", () => document.querySelector("#settingsPop").classList.add("hidden"));
document.querySelector("#fullscreenToggle").addEventListener("click", async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
});
async function applySettings() { document.body.dataset.theme = document.querySelector("#themeSelect").value; aiProvider = document.querySelector("#providerSelect").value; aiModel = document.querySelector("#modelSelect").value; document.querySelector("#chatProviderLabel").textContent = aiProvider === "groq" ? "Groq" : "Grok"; await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: document.body.dataset.theme, provider: aiProvider, model: aiModel }) }); }
function updateModels(data, wanted) { const provider = document.querySelector("#providerSelect").value; const select = document.querySelector("#modelSelect"); select.replaceChildren(...data.providers[provider].models.map(model => new Option(model, model))); select.value = data.providers[provider].models.includes(wanted) ? wanted : data.providers[provider].models[0]; grokConfig.textContent = data.providers[provider].configured ? `${provider} ready` : `${provider} uses the Dev Utils key when configured.`; }
document.querySelector("#themeSelect").addEventListener("change", applySettings);
document.querySelector("#providerSelect").addEventListener("change", () => { updateModels(window.aiStatus); applySettings(); });
document.querySelector("#modelSelect").addEventListener("change", applySettings);
document.querySelector("#chatSuspend").addEventListener("click", () => drawer.classList.toggle("suspended"));
document.querySelector("#chatExpand").addEventListener("click", () => drawer.classList.toggle("expanded"));
let drag = null; document.querySelector("#chatHead").addEventListener("pointerdown", event => { if (event.target.closest("button")) return; drag = { x:event.clientX-drawer.offsetLeft, y:event.clientY-drawer.offsetTop }; document.addEventListener("pointermove", moveChat); document.addEventListener("pointerup", stopDrag, { once:true }); }); function moveChat(event) { if (!drag) return; drawer.style.left = Math.max(0,event.clientX-drag.x)+"px"; drawer.style.top = Math.max(0,event.clientY-drag.y)+"px"; drawer.style.right="auto"; drawer.style.bottom="auto"; } function stopDrag(){ drag=null; document.removeEventListener("pointermove",moveChat); }
document.querySelector("#chatSend").addEventListener("click", sendGrokMessage);
chatInput.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendGrokMessage(); } });

function renderModules(modules) { moduleList.innerHTML = modules.map(module => `<div class="module-row"><b>${module.title_fr}</b><small>${module.title_ar} · ${module.status}</small></div>`).join(""); }
async function loadConfig() {
  const [configResponse, grokResponse] = await Promise.all([fetch("/api/config"), fetch("/api/grok/status")]);
  const data = await configResponse.json();
  const grok = await grokResponse.json(); window.aiStatus = grok;
  renderModules(data.modules);
  document.body.dataset.theme = themeOrder.includes(data.settings.theme) ? data.settings.theme : "graphite";
  document.querySelector("#themeSelect").value = document.body.dataset.theme; document.querySelector("#providerSelect").value = data.settings.provider || "grok"; updateModels(grok, data.settings.model); aiProvider = document.querySelector("#providerSelect").value; aiModel = document.querySelector("#modelSelect").value; document.querySelector("#chatProviderLabel").textContent = aiProvider === "groq" ? "Groq" : "Grok";
}
document.querySelector("#savePractice").addEventListener("click", async () => {
  const response = await fetch("/api/samples", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module_slug: "programmation-concurrente-parallele", title: "PAR basics practice", kind: "practice" }) });
  status.textContent = response.ok ? "Saved in SQLite · تم الحفظ في SQLite" : "Could not save the note.";
});
showSection(location.hash.slice(1));
loadConfig().catch(error => { status.textContent = `SQLite unavailable: ${error.message}`; });
