// config.js — ডিফল্ট সেটিংস আর localStorage-এ সেভ/লোড করার লজিক

const DEFAULT_SETTINGS = {
  theme: "aurora",

  groqKey: "",
  groqModel: "openai/gpt-oss-20b",

  geminiKey: "",
  geminiModel: "gemini-2.0-flash",

  openrouterKey: "",
  openrouterModel: "meta-llama/llama-3.3-70b-instruct:free",

  openaiKey: "",
  openaiModel: "gpt-4o-mini",

  systemPrompt: "তুমি Lara, একজন সহায়ক বাংলা AI অ্যাসিস্ট্যান্ট। সবসময় বাংলায়, সংক্ষেপে (২-৩ বাক্যের বেশি না) উত্তর দাও।",

  elevenKey: "",
  elevenVoiceId: "",

  sttLang: "bn-BD",
  callMode: false
};

const STORAGE_KEY = "lara_settings_v1";

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.error("Settings load error:", e);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// প্রতিটা provider কীভাবে try করতে হবে তার তালিকা, ক্রম অনুযায়ী।
function getActiveProviders(settings) {
  const list = [];
  if (settings.groqKey) {
    list.push({ name: "Groq", type: "openai-compatible", url: "https://api.groq.com/openai/v1/chat/completions", key: settings.groqKey, model: settings.groqModel });
  }
  if (settings.geminiKey) {
    list.push({ name: "Gemini", type: "gemini", key: settings.geminiKey, model: settings.geminiModel });
  }
  if (settings.openrouterKey) {
    list.push({ name: "OpenRouter", type: "openai-compatible", url: "https://openrouter.ai/api/v1/chat/completions", key: settings.openrouterKey, model: settings.openrouterModel });
  }
  if (settings.openaiKey) {
    list.push({ name: "OpenAI", type: "openai-compatible", url: "https://api.openai.com/v1/chat/completions", key: settings.openaiKey, model: settings.openaiModel });
  }
  return list;
}
