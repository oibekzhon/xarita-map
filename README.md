# Xarita (Ob-havo xaritasi) — mustaqil loyiha

Bu loyiha **admin panelga bog'liq emas** — o'z backendi, o'z frontendi, o'z domeni bilan mustaqil ishlaydi.

## 📁 Fayllar tuzilishi (VS Code'da)

```
xarita-app/
├── backend/
│   ├── src/
│   │   ├── server.js              ← Express kirish nuqtasi
│   │   └── routes/
│   │       ├── config.js          ← GET /api/config (Firebase public config)
│   │       ├── weather.js         ← GET /api/weather (OpenWeatherMap proxy)
│   │       └── geocode.js         ← GET /api/geocode/search, /reverse (Nominatim proxy)
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── firestore.rules                ← Firebase Console'ga qo'yiladi
├── database.rules.json
└── README.md
```

## 🌐 Rejalashtirilgan manzil

- **Frontend:** `https://xarita.yolaco.uz`
- **Backend:** Ahost'da alohida Node.js ilova (masalan `https://xarita-api.yolaco.uz` yoki Ahost bergan texnik domen)

---

## 1-BOSQICH — GitHub'da repo yaratish va yuklash

1. [github.com](https://github.com) → **New repository** → nom bering, masalan `xarita-map` → **Create repository** (README qo'shmasdan yaratsangiz ham bo'ladi).
2. Repo ochilgach, **"uploading an existing file"** havolasini bosing (yoki `Add file → Upload files`).
3. Ushbu `xarita-app` papkasining **butun tarkibini** (backend/, frontend/, firestore.rules, database.rules.json, README.md) yuklang — GitHub'ga papkani sudrab tashlasangiz, ichidagi struktura saqlanib qoladi.
4. **Commit changes** tugmasini bosing.

> Muhim: `.env` faylini HECH QACHON yuklamang — u faqat sizning kompyuteringizda yoki hosting panelida bo'lishi kerak (`.gitignore` buni allaqachon oldini oladi).

## 2-BOSQICH — Firebase sozlash

1. [console.firebase.google.com](https://console.firebase.google.com) → loyihangiz → **Firestore Database → Rules** → `firestore.rules` tarkibini joylashtirib **Publish**.
2. **Realtime Database → Rules** → `database.rules.json` tarkibini joylashtirib **Publish**.
3. **Authentication → Settings → Authorized domains** → `xarita.yolaco.uz` domenini qo'shing (`Add domain`).

## 3-BOSQICH — Backendni Ahost'ga deploy qilish

1. [clients.ahost.uz](https://clients.ahost.uz) panelga kiring → Node.js ilova yaratish bo'limini toping.
2. Repo manzilini ulang yoki `backend/` papkasini alohida yuklang (Ahost interfeysiga qarab).
3. **Root papka:** `backend`
4. **Start command:** `npm install && npm start`
5. **Environment Variables** bo'limiga `.env.example` dagi barcha qiymatlarni qo'lda kiriting:
   - `OPENWEATHER_API_KEY` — [home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys) dan oling
   - `FIREBASE_*` — Firebase Console → Project settings → General → "Your apps" bo'limidan
   - `ALLOWED_ORIGINS=https://xarita.yolaco.uz`
6. Deploy tugagach, Ahost sizga backend manzilini beradi (masalan `https://xarita-api.yolaco.uz` yoki texnik domen). Uni brauzerda `/api/health` bilan tekshiring.

## 4-BOSQICH — Frontendni sozlash

`frontend/index.html` faylini oching va boshidagi qatorni haqiqiy backend manzilingizga almashtiring:

```html
<script>
  window.__BACKEND_URL__ = "https://xarita-api.yolaco.uz";
</script>
```

## 5-BOSQICH — Frontendni Vercel'da deploy qilish va subdomen bog'lash

1. [vercel.com](https://vercel.com) → **Add New → Project** → yuqorida yaratgan GitHub repongizni tanlang.
2. **Root Directory** maydonida `frontend` ni tanlang.
3. **Framework Preset:** Other, Build command va Output directory — bo'sh qoldiring.
4. **Deploy**.
5. Deploy tugagach: loyiha ichida **Settings → Domains → Add** tugmasini bosib, `xarita.yolaco.uz` deb yozing.
6. Vercel sizga bitta **CNAME** yozuvi beradi (masalan `cname.vercel-dns.com`). Shu yozuvni **Ahost DNS boshqaruvi** (yolaco.uz domeningiz DNS sozlamalari, odatda Ahost client panelida "DNS Zone Editor" yoki shunga o'xshash bo'lim) ichiga qo'shing:
   - **Turi:** CNAME
   - **Nomi/Host:** `xarita`
   - **Qiymati:** Vercel bergan manzil
7. Bir necha daqiqadan bir necha soatgacha kutgach (DNS tarqalishi), `https://xarita.yolaco.uz` ochilib, sayt ishlay boshlaydi.

## 6-BOSQICH — Yakuniy tekshiruv

- [ ] Backend `/api/health` → `{"status":"ok"}`
- [ ] `xarita.yolaco.uz` ochilib, xarita ko'rinyaptimi?
- [ ] Joy bosilganda ob-havo chiqyaptimi? (Network tabda `openweathermap.org` ko'rinmasligi kerak — faqat backend domeningiz)
- [ ] Google orqali kirish, nickname va do'stlar funksiyasi ishlayaptimi?
