// app.js — Lara-র মূল লজিক
// ধাপ: মাইক/কল মোড → শোনা (Web Speech API) → একাধিক AI provider (fallback সহ) → জবাব → বলা
// কল মোড চালু থাকলে ফুল-স্ক্রিন কল-UI + 3D অ্যানিমেটেড চরিত্র দেখানো হয়।

let settings = loadSettings();
let recognizer = null;
let isListening = false;
let callModeOn = false;
let callTimerInterval = null;
let callSeconds = 0;
let isMuted = false;

// ---- home screen elements ----
const orb = document.getElementById("orb");
const statusText = document.getElementById("statusText");
const micBtn = document.getElementById("micBtn");
const chatLog = document.getElementById("chatLog");
const callModeBtn = document.getElementById("callModeBtn");

// ---- call screen elements ----
const callScreen = document.getElementById("callScreen");
const avatar3d = document.getElementById("avatar3d");
const callCaption = document.getElementById("callCaption");
const callTimerEl = document.getElementById("callTimer");
const endCallBtn = document.getElementById("endCallBtn");
const muteBtn = document.getElementById("muteBtn");
const speakerBtn = document.getElementById("speakerBtn");

// ---- settings elements ----
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const saveSettingsBtn = document.getElementById("saveSettings");
const saveMsg = document.getElementById("saveMsg");
const themePicker = document.getElementById("themePicker");

const fields = {
  groqKey: document.getElementById("groqKey"),
  groqModel: document.getElementById("groqModel"),
  geminiKey: document.getElementById("geminiKey"),
  geminiModel: document.getElementById("geminiModel"),
  openrouterKey: document.getElementById("openrouterKey"),
  openrouterModel: document.getElementById("openrouterModel"),
  openaiKey: document.getElementById("openaiKey"),
  openaiModel: document.getElementById("openaiModel"),
  systemPrompt: document.getElementById("systemPrompt"),
  elevenKey: document.getElementById("elevenKey"),
  elevenVoiceId: document.getElementById("elevenVoiceId"),
  sttLang: document.getElementById("sttLang")
};

// ---------- UI STATE (orb + avatar একসাথে সিঙ্ক থাকে) ----------
function setUIState(state) {
  // state: idle | listening | thinking | speaking
  orb.classList.remove("idle", "listening", "thinking", "speaking");
  orb.classList.add(state);
  avatar3d.classList.remove("idle", "listening", "thinking", "speaking");
  avatar3d.classList.add(state);
}

function setStatus(text) {
  statusText.textContent = text;
  callCaption.textContent = text;
}

function addBubble(text, who) {
  const div = document.createElement("div");
  div.className = "bubble " + (who === "user" ? "user" : "lara");
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// ---------- THEME ----------
function applyTheme(themeName) {
  document.body.setAttribute("data-theme", themeName);
  document.querySelectorAll(".theme-swatch").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.theme === themeName);
  });
}

themePicker.addEventListener("click", (e) => {
  const btn = e.target.closest(".theme-swatch");
  if (!btn) return;
  settings.theme = btn.dataset.theme;
  saveSettings(settings);
  applyTheme(settings.theme);
});

// ---------- CALL SCREEN ----------
function openCallScreen() {
  callScreen.classList.remove("hidden");
  callSeconds = 0;
  updateCallTimer();
  callTimerInterval = setInterval(() => {
    callSeconds++;
    updateCallTimer();
  }, 1000);
}

function closeCallScreen() {
  callScreen.classList.add("hidden");
  clearInterval(callTimerInterval);
}

function updateCallTimer() {
  const m = String(Math.floor(callSeconds / 60)).padStart(2, "0");
  const s = String(callSeconds % 60).padStart(2, "0");
  callTimerEl.textContent = `${m}:${s}`;
}

// ---------- CALL MODE টগল ----------
function turnCallModeOn() {
  callModeOn = true;
  settings.callMode = true;
  saveSettings(settings);
  callModeBtn.classList.add("active");
  openCallScreen();
  setStatus("কল মোড চালু হচ্ছে...");
  if (!isListening) startListening();
}

function turnCallModeOff() {
  callModeOn = false;
  settings.callMode = false;
  saveSettings(settings);
  callModeBtn.classList.remove("active");
  closeCallScreen();
  if (isListening) { recognizer && recognizer.stop(); }
  resetToIdle();
}

callModeBtn.addEventListener("click", () => {
  callModeOn ? turnCallModeOff() : turnCallModeOn();
});
endCallBtn.addEventListener("click", turnCallModeOff);

muteBtn.addEventListener("click", () => {
  isMuted = !isMuted;
  muteBtn.classList.toggle("muted", isMuted);
  if (isMuted && isListening) {
    recognizer && recognizer.stop();
  } else if (!isMuted && callModeOn && !isListening) {
    startListening();
  }
});

speakerBtn.addEventListener("click", () => {
  speakerBtn.classList.toggle("muted");
});

// ---------- SETTINGS PANEL ----------
function fillSettingsForm() {
  fields.groqKey.value = settings.groqKey;
  fields.groqModel.value = settings.groqModel;
  fields.geminiKey.value = settings.geminiKey;
  fields.geminiModel.value = settings.geminiModel;
  fields.openrouterKey.value = settings.openrouterKey;
  fields.openrouterModel.value = settings.openrouterModel;
  fields.openaiKey.value = settings.openaiKey;
  fields.openaiModel.value = settings.openaiModel;
  fields.systemPrompt.value = settings.systemPrompt;
  fields.elevenKey.value = settings.elevenKey;
  fields.elevenVoiceId.value = settings.elevenVoiceId;
  fields.sttLang.value = settings.sttLang;
  applyTheme(settings.theme);
}

settingsBtn.addEventListener("click", () => {
  fillSettingsForm();
  settingsPanel.classList.remove("hidden");
});
closeSettings.addEventListener("click", () => settingsPanel.classList.add("hidden"));

saveSettingsBtn.addEventListener("click", () => {
  settings.groqKey = fields.groqKey.value.trim();
  settings.groqModel = fields.groqModel.value.trim() || DEFAULT_SETTINGS.groqModel;
  settings.geminiKey = fields.geminiKey.value.trim();
  settings.geminiModel = fields.geminiModel.value.trim() || DEFAULT_SETTINGS.geminiModel;
  settings.openrouterKey = fields.openrouterKey.value.trim();
  settings.openrouterModel = fields.openrouterModel.value.trim() || DEFAULT_SETTINGS.openrouterModel;
  settings.openaiKey = fields.openaiKey.value.trim();
  settings.openaiModel = fields.openaiModel.value.trim() || DEFAULT_SETTINGS.openaiModel;
  settings.systemPrompt = fields.systemPrompt.value.trim() || DEFAULT_SETTINGS.systemPrompt;
  settings.elevenKey = fields.elevenKey.value.trim();
  settings.elevenVoiceId = fields.elevenVoiceId.value.trim();
  settings.sttLang = fields.sttLang.value;
  saveSettings(settings);
  saveMsg.textContent = "সেভ হয়েছে ✓";
  setTimeout(() => { saveMsg.textContent = ""; }, 1800);
});

// ---------- SPEECH RECOGNITION (STT) ----------
function getRecognizer() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("এই ব্রাউজার Speech Recognition সাপোর্ট করে না। Chrome ব্যবহার করুন।");
    return null;
  }
  const r = new SpeechRecognition();
  r.lang = settings.sttLang;
  r.interimResults = false;
  r.maxAlternatives = 1;
  return r;
}

function startListening() {
  const providers = getActiveProviders(settings);
  if (providers.length === 0) {
    alert("প্রথমে Settings (⚙) থেকে অন্তত একটা AI provider-এর API Key দিন।");
    settingsPanel.classList.remove("hidden");
    return;
  }
  if (isMuted) return;

  recognizer = getRecognizer();
  if (!recognizer) return;

  isListening = true;
  micBtn.classList.add("recording");
  setUIState("listening");
  setStatus("শুনছি...");

  recognizer.onresult = (event) => {
    const heardText = event.results[0][0].transcript;
    addBubble(heardText, "user");
    handleUserSpeech(heardText);
  };

  recognizer.onerror = (event) => {
    console.error("STT error:", event.error);
    setStatus("শুনতে সমস্যা হয়েছে");
    if (callModeOn) {
      setTimeout(() => { if (callModeOn && !isMuted) startListening(); }, 1200);
    } else {
      resetToIdle();
    }
  };

  recognizer.onend = () => {
    isListening = false;
    micBtn.classList.remove("recording");
  };

  recognizer.start();
}

micBtn.addEventListener("click", () => {
  if (isListening) {
    recognizer && recognizer.stop();
    resetToIdle();
    return;
  }
  startListening();
});

function resetToIdle() {
  setUIState("idle");
  setStatus(callModeOn ? "কল মোড চালু আছে" : "চাপুন এবং কথা বলুন, অথবা নিচে কল মোড চালু করুন");
}

// ---------- AI CALL — একাধিক provider, fallback সহ ----------
async function callOpenAICompatible(provider, heardText) {
  const response = await fetch(provider.url, {
    method: "POST",
    headers: { "Authorization": "Bearer " + provider.key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: settings.systemPrompt },
        { role: "user", content: heardText }
      ]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(provider.name + ": " + (data.error.message || "error"));
  return data.choices[0].message.content;
}

async function callGemini(provider, heardText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.key}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: heardText }] }],
      systemInstruction: { parts: [{ text: settings.systemPrompt }] }
    })
  });
  const data = await response.json();
  if (data.error) throw new Error("Gemini: " + (data.error.message || "error"));
  return data.candidates[0].content.parts[0].text;
}

async function askAI(heardText) {
  const providers = getActiveProviders(settings);
  let lastError = null;
  for (const provider of providers) {
    try {
      setStatus(provider.name + " কে জিজ্ঞেস করছি...");
      if (provider.type === "gemini") return await callGemini(provider, heardText);
      return await callOpenAICompatible(provider, heardText);
    } catch (err) {
      console.warn(provider.name + " ব্যর্থ, পরেরটা try করছি:", err.message);
      lastError = err;
      continue;
    }
  }
  throw lastError || new Error("কোনো AI provider কাজ করলো না");
}

async function handleUserSpeech(heardText) {
  setUIState("thinking");
  setStatus("ভাবছি...");

  try {
    const reply = await askAI(heardText);
    addBubble(reply, "lara");
    callCaption.textContent = reply;
    await speak(reply);
  } catch (err) {
    console.error("AI error:", err);
    const msg = "দুঃখিত, একটা সমস্যা হয়েছে: " + err.message;
    addBubble(msg, "lara");
    await speak("দুঃখিত, একটা সমস্যা হয়েছে।");
  } finally {
    if (callModeOn && !isMuted) {
      setStatus("কল মোড — আবার শুনছি...");
      startListening();
    } else {
      resetToIdle();
    }
  }
}

// ---------- TEXT TO SPEECH (TTS) ----------
async function speak(text) {
  setUIState("speaking");
  setStatus("বলছি...");

  if (settings.elevenKey && settings.elevenVoiceId) {
    try { await speakWithElevenLabs(text); return; }
    catch (err) { console.error("ElevenLabs error, falling back:", err); }
  }
  await speakWithBrowser(text);
}

function speakWithBrowser(text) {
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = settings.sttLang.startsWith("bn") ? "bn-BD" : "en-US";
    utter.onend = resolve;
    utter.onerror = resolve;
    speechSynthesis.speak(utter);
  });
}

async function speakWithElevenLabs(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenVoiceId}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": settings.elevenKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if (!response.ok) throw new Error("ElevenLabs request failed");
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  return new Promise((resolve) => {
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play();
  });
}

// ---------- পেজ লোড ----------
window.addEventListener("load", () => {
  applyTheme(settings.theme);
  if (settings.callMode) turnCallModeOn();
});
