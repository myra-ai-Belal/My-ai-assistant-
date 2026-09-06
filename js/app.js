// app.js — Lara-র মূল লজিক
// STT (Web Speech API) → একাধিক AI provider (fallback) → একাধিক TTS provider (fallback)
// এরর হলে Settings প্যানেলে স্পষ্ট করে দেখানো হয়, চুপচাপ চাপা পড়ে না।

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
const ttsErrorLog = document.getElementById("ttsErrorLog");
const aiErrorLog = document.getElementById("aiErrorLog");
const testVoiceBtn = document.getElementById("testVoiceBtn");
const testAiBtn = document.getElementById("testAiBtn");

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
  murfKey: document.getElementById("murfKey"),
  murfVoiceId: document.getElementById("murfVoiceId"),
  sttLang: document.getElementById("sttLang")
};

// ---------- UI STATE (orb + avatar একসাথে সিঙ্ক থাকে) ----------
function setUIState(state) {
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
  callTimerInterval = setInterval(() => { callSeconds++; updateCallTimer(); }, 1000);
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
callModeBtn.addEventListener("click", () => callModeOn ? turnCallModeOff() : turnCallModeOn());
endCallBtn.addEventListener("click", turnCallModeOff);

muteBtn.addEventListener("click", () => {
  isMuted = !isMuted;
  muteBtn.classList.toggle("muted", isMuted);
  if (isMuted && isListening) recognizer && recognizer.stop();
  else if (!isMuted && callModeOn && !isListening) startListening();
});
speakerBtn.addEventListener("click", () => speakerBtn.classList.toggle("muted"));

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
  fields.murfKey.value = settings.murfKey;
  fields.murfVoiceId.value = settings.murfVoiceId;
  fields.sttLang.value = settings.sttLang;
  applyTheme(settings.theme);
  ttsErrorLog.textContent = "";
  aiErrorLog.textContent = "";
}
settingsBtn.addEventListener("click", () => { fillSettingsForm(); settingsPanel.classList.remove("hidden"); });
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
  settings.murfKey = fields.murfKey.value.trim();
  settings.murfVoiceId = fields.murfVoiceId.value.trim();
  settings.sttLang = fields.sttLang.value;
  saveSettings(settings);
  saveMsg.textContent = "সেভ হয়েছে ✓";
  setTimeout(() => { saveMsg.textContent = ""; }, 1800);
});

// ---------- টেস্ট বাটন — সরাসরি সেটিংস থেকেই যাচাই ----------
testVoiceBtn.addEventListener("click", async () => {
  ttsErrorLog.textContent = "টেস্ট হচ্ছে...";
  // ফর্মে যা এখন লেখা আছে তা দিয়েই টেস্ট করি (সেভ না করেও)
  const tempSettings = { ...settings,
    elevenKey: fields.elevenKey.value.trim(),
    elevenVoiceId: fields.elevenVoiceId.value.trim(),
    murfKey: fields.murfKey.value.trim(),
    murfVoiceId: fields.murfVoiceId.value.trim(),
    sttLang: fields.sttLang.value
  };
  try {
    await speakText("এটা একটা ভয়েস টেস্ট বার্তা।", tempSettings, (msg) => { ttsErrorLog.textContent = msg; });
    ttsErrorLog.textContent = "✅ ভয়েস চলেছে (যেই provider সফল হয়েছে সেটার নাম উপরে লগে দেখুন)";
  } catch (err) {
    ttsErrorLog.textContent = "❌ সব provider ব্যর্থ: " + err.message;
  }
});

testAiBtn.addEventListener("click", async () => {
  aiErrorLog.textContent = "টেস্ট হচ্ছে...";
  const tempSettings = { ...settings,
    groqKey: fields.groqKey.value.trim(), groqModel: fields.groqModel.value.trim(),
    geminiKey: fields.geminiKey.value.trim(), geminiModel: fields.geminiModel.value.trim(),
    openrouterKey: fields.openrouterKey.value.trim(), openrouterModel: fields.openrouterModel.value.trim(),
    openaiKey: fields.openaiKey.value.trim(), openaiModel: fields.openaiModel.value.trim(),
    systemPrompt: fields.systemPrompt.value.trim() || DEFAULT_SETTINGS.systemPrompt
  };
  try {
    const reply = await askAI("তুমি কে?", tempSettings, (msg) => { aiErrorLog.textContent = msg; });
    aiErrorLog.textContent = "✅ জবাব এসেছে: " + reply;
  } catch (err) {
    aiErrorLog.textContent = "❌ সব provider ব্যর্থ: " + err.message;
  }
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
    if (callModeOn) setTimeout(() => { if (callModeOn && !isMuted) startListening(); }, 1200);
    else resetToIdle();
  };
  recognizer.onend = () => { isListening = false; micBtn.classList.remove("recording"); };
  recognizer.start();
}

micBtn.addEventListener("click", () => {
  if (isListening) { recognizer && recognizer.stop(); resetToIdle(); return; }
  startListening();
});

function resetToIdle() {
  setUIState("idle");
  setStatus(callModeOn ? "কল মোড চালু আছে" : "চাপুন এবং কথা বলুন, অথবা নিচে কল মোড চালু করুন");
}

// ---------- AI CALL — একাধিক provider, fallback সহ ----------
async function callOpenAICompatible(provider, heardText, systemPrompt) {
  const response = await fetch(provider.url, {
    method: "POST",
    headers: { "Authorization": "Bearer " + provider.key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: heardText }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(provider.name + ": " + (data.error.message || JSON.stringify(data.error)));
  if (!data.choices) throw new Error(provider.name + ": অপ্রত্যাশিত রেসপন্স — " + JSON.stringify(data).slice(0, 200));
  return data.choices[0].message.content;
}

async function callGemini(provider, heardText, systemPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.key}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: heardText }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    })
  });
  const data = await response.json();
  if (data.error) throw new Error("Gemini: " + (data.error.message || JSON.stringify(data.error)));
  if (!data.candidates) throw new Error("Gemini: অপ্রত্যাশিত রেসপন্স — " + JSON.stringify(data).slice(0, 200));
  return data.candidates[0].content.parts[0].text;
}

// settingsObj আর onProgress প্যারামিটার — টেস্ট বাটন থেকেও ব্যবহারযোগ্য করার জন্য
async function askAI(heardText, settingsObj = settings, onProgress = () => {}) {
  const providers = getActiveProviders(settingsObj);
  if (providers.length === 0) throw new Error("কোনো AI provider key দেওয়া নেই");
  let lastError = null;
  for (const provider of providers) {
    try {
      onProgress(provider.name + " কে জিজ্ঞেস করছি...");
      setStatus(provider.name + " কে জিজ্ঞেস করছি...");
      if (provider.type === "gemini") return await callGemini(provider, heardText, settingsObj.systemPrompt);
      return await callOpenAICompatible(provider, heardText, settingsObj.systemPrompt);
    } catch (err) {
      console.warn(provider.name + " ব্যর্থ:", err.message);
      onProgress("⚠️ " + provider.name + " ব্যর্থ: " + err.message + " — পরেরটা try করছি...");
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
    const reply = await askAI(heardText, settings);
    addBubble(reply, "lara");
    callCaption.textContent = reply;
    await speak(reply);
  } catch (err) {
    console.error("AI error:", err);
    const msg = "দুঃখিত, একটা সমস্যা হয়েছে: " + err.message;
    addBubble(msg, "lara");
    await speak("দুঃখিত, একটা সমস্যা হয়েছে।");
  } finally {
    if (callModeOn && !isMuted) { setStatus("কল মোড — আবার শুনছি..."); startListening(); }
    else resetToIdle();
  }
}

// ---------- TEXT TO SPEECH (TTS) — ElevenLabs → Murf → Browser ----------
async function speak(text) {
  await speakText(text, settings, (msg) => console.log("TTS:", msg));
}

async function speakText(text, settingsObj, onProgress) {
  setUIState("speaking");
  setStatus("বলছি...");

  if (settingsObj.elevenKey && settingsObj.elevenVoiceId) {
    try {
      onProgress("ElevenLabs try হচ্ছে...");
      await speakWithElevenLabs(text, settingsObj);
      onProgress("✅ ElevenLabs দিয়ে বলা হয়েছে");
      return;
    } catch (err) {
      console.error("ElevenLabs error:", err);
      onProgress("⚠️ ElevenLabs ব্যর্থ: " + err.message + " — Murf try হচ্ছে...");
    }
  }

  if (settingsObj.murfKey && settingsObj.murfVoiceId) {
    try {
      await speakWithMurf(text, settingsObj);
      onProgress("✅ Murf.ai দিয়ে বলা হয়েছে");
      return;
    } catch (err) {
      console.error("Murf error:", err);
      onProgress("⚠️ Murf ব্যর্থ: " + err.message + " — ফোনের ডিফল্ট ভয়েসে যাচ্ছি...");
    }
  }

  await speakWithBrowser(text, settingsObj);
  onProgress("✅ ফোনের ডিফল্ট ভয়েস দিয়ে বলা হয়েছে (ElevenLabs/Murf সেট করা নেই বা ব্যর্থ হয়েছে)");
}

function speakWithBrowser(text, settingsObj) {
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = settingsObj.sttLang.startsWith("bn") ? "bn-BD" : "en-US";
    utter.onend = resolve;
    utter.onerror = resolve;
    speechSynthesis.speak(utter);
  });
}

async function speakWithElevenLabs(text, settingsObj) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${settingsObj.elevenVoiceId}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": settingsObj.elevenKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status} — ${errText.slice(0, 150)}`);
  }
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  return new Promise((resolve, reject) => {
    audio.onended = resolve;
    audio.onerror = () => reject(new Error("অডিও প্লে করা যায়নি"));
    audio.play().catch(reject);
  });
}

async function speakWithMurf(text, settingsObj) {
  // Mimi.js বট থেকে যাচাই করা কাজ-করা পদ্ধতি — global streaming endpoint,
  // raw audio bytes ফেরত আসে (JSON/URL না), তাই সরাসরি blob বানানো হয়।
  const response = await fetch("https://global.api.murf.ai/v1/speech/stream", {
    method: "POST",
    headers: { "api-key": settingsObj.murfKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text,
      voiceId: settingsObj.murfVoiceId || "Ishani",
      model: settingsObj.murfModel || "FALCON",
      locale: settingsObj.murfLocale || "en-US",
      sampleRate: 24000,
      format: "MP3"
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status} — ${errText.slice(0, 150)}`);
  }
  const audioBuffer = await response.arrayBuffer();
  if (audioBuffer.byteLength < 200) throw new Error("Murf থেকে খালি অডিও এসেছে");
  const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  return new Promise((resolve, reject) => {
    audio.onended = resolve;
    audio.onerror = () => reject(new Error("অডিও প্লে করা যায়নি"));
    audio.play().catch(reject);
  });
}

// ---------- পেজ লোড ----------
window.addEventListener("load", () => {
  applyTheme(settings.theme);
  if (settings.callMode) turnCallModeOn();
});
