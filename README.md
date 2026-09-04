# My-ai-assistant-
# Lara — ব্যক্তিগত AI ভয়েস অ্যাসিস্ট্যান্ট

বাংলা ভাষায় কথা বলা যায় এমন একটা ফ্রি, ব্যক্তিগত AI ভয়েস অ্যাসিস্ট্যান্ট। সম্পূর্ণভাবে
মোবাইল ফোন থেকে ডেভেলপ করা হচ্ছে (কোনো কম্পিউটার ছাড়া), Groq-এর ফ্রি API ব্যবহার করে।

## বর্তমান স্ট্যাটাস: Phase 2 — ওয়েব ভার্সন

এই রিপোতে এখন একটা কাজ করা **ওয়েব অ্যাপ** আছে যেটা যেকোনো মোবাইল ব্রাউজারে (Chrome)
খুলে টেস্ট করা যাবে। পরের ধাপে এটাকে Capacitor দিয়ে আসল APK-তে রূপান্তর করা হবে।

## ফাইল স্ট্রাকচার

```
lara-ai-assistant/
├── index.html          → মূল পেজ (UI)
├── css/
│   └── style.css       → ডিজাইন, অ্যানিমেটেড orb
├── js/
│   ├── config.js       → সেটিংস ডিফল্ট + localStorage
│   └── app.js           → মূল লজিক (STT → Groq → TTS)
├── .github/
│   └── workflows/
│       └── build-apk.yml   → (Phase 4) GitHub Actions দিয়ে APK বানানোর জন্য, এখনো active না
├── package.json         → (Phase 3) Capacitor সেটআপের জন্য প্রস্তুত রাখা
├── capacitor.config.json → (Phase 3) Capacitor কনফিগ
└── README.md             → এই ফাইল
```

## কীভাবে টেস্ট করবেন (এখনই, ফোন থেকে)

1. GitHub রিপোর **Settings → Pages** এ গিয়ে GitHub Pages চালু করুন (branch: main, folder: / root)
2. কিছুক্ষণ পর একটা লিংক পাবেন, যেমন: `https://<username>.github.io/lara-ai-assistant/`
3. ফোনের **Chrome** ব্রাউজারে সেই লিংক খুলুন
4. উপরে ডানদিকে **⚙ (Settings)** আইকনে ট্যাপ করে নিজের **Groq API Key** বসান, সেভ করুন
5. নিচের মাইক বাটনে চেপে বাংলায় কথা বলুন

## প্রয়োজনীয় API Key (অন্তত একটা AI provider লাগবে)

Settings-এ একাধিক provider-এর key দেওয়া যায়। যেই ক্রমে key ভরা থাকবে, সেই ক্রমে try
হবে — একটা ব্যর্থ/লিমিট শেষ হলে পরেরটায় automatic চলে যাবে:

1. **Groq** — [console.groq.com](https://console.groq.com) (ফ্রি, সবচেয়ে দ্রুত)
2. **Gemini** — [aistudio.google.com](https://aistudio.google.com/app/apikey) (ফ্রি)
3. **OpenRouter** — [openrouter.ai](https://openrouter.ai/keys) (`:free` লেখা মডেলগুলো ফ্রি)
4. **OpenAI** — পেইড, থাকলে ব্যবহার হবে

- **ElevenLabs API Key** (ঐচ্ছিক) — realistic ভয়েসের জন্য, না দিলে ফোনের ডিফল্ট TTS ব্যবহার হবে

## কল মোড

মূল স্ক্রিনে "📞 কল মোড" বাটন চালু করলে, প্রতিবার Lara জবাব দেওয়ার পর নিজে থেকেই আবার
শুনতে শুরু করবে — বারবার মাইক বাটনে চাপার দরকার নেই, ফোনে কল করে কথা বলার মতো
অভিজ্ঞতা। বন্ধ করতে আবার বাটনে চাপুন।

⚠️ এই ওয়েব ভার্সনে Android/Chrome-এর নিজস্ব speech recognition ব্যবহার হয়, তাই শোনা
শুরু/শেষ হওয়ার সময় একটা সিস্টেম বিপ শব্দ আসবে — এটা এই পর্যায়ে সরানো সম্ভব না। Phase 3-এ
native speech plugin বসালে এটা ঠিক হবে।

⚠️ **কোনো API key কোডে/GitHub-এ কমিট করবেন না।** সব key শুধু Settings প্যানেল থেকে
দেওয়া হয় এবং ফোনের localStorage-এ (শুধু আপনার ব্রাউজারে) সেভ থাকে, GitHub-এ যায় না।

## রোডম্যাপ

- [x] Phase 1 — GitHub রিপো সেটআপ
- [x] Phase 2 — ওয়েব ভার্সন (এই কোড) — STT + Groq + TTS + সেটিংস
- [ ] Phase 3 — Capacitor দিয়ে Android প্রজেক্টে রূপান্তর
- [ ] Phase 4 — GitHub Actions দিয়ে ক্লাউডে APK বিল্ড
- [ ] Phase 5 — ফিচার সম্প্রসারণ: WhatsApp/Messenger auto-reply (Watomatic-স্টাইল), ফোন কন্ট্রোল, কথোপকথনের memory, একাধিক AI provider fallback


## কল স্ক্রিন ও 3D অ্যানিমেটেড চরিত্র

কল মোড চালু করলে একটা পূর্ণ-স্ক্রিন "কল UI" খুলবে — ফোনে কল করার মতো দেখতে, মাঝে একটা
ভাসমান 3D-স্টাইল চরিত্র থাকবে যেটা:
- সবসময় আস্তে আস্তে ভাসতে/দুলতে থাকে (idle)
- চোখ পলক ফেলে
- শোনার সময় halo জোরে জ্বলে
- ভাবার সময় দ্রুত পলক ফেলে ও দোলে
- কথা বলার সময় মুখ নড়ে (lip-sync স্টাইল অ্যানিমেশন)

নিচে Mute, End call, Speaker বাটন আছে — End call চাপলে কল মোড বন্ধ হয়ে যাবে।

## থিম / রঙ

Settings-এ ৪টা রঙিন থিম আছে (Aurora নীল-বেগুনি, Sunset কমলা-গোলাপি, Emerald সবুজ-নীল,
Royal সোনালি-বেগুনি) — সোয়াচে ট্যাপ করলেই সাথে সাথে বদলে যায় ও সেভ থাকে।
