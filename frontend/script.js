const BACKEND_URL = window.__BACKEND_URL__ || "http://localhost:5000";

const translations = {
  "clear sky": "Ochiq osmon",
  "few clouds": "Oz bulutli",
  "scattered clouds": "Bulutli",
  "broken clouds": "Qisman bulutli",
  "overcast clouds": "To'liq bulutli",
  "light rain": "Yengil yomg'ir",
  "moderate rain": "O'rtacha yomg'ir",
  "heavy intensity rain": "Kuchli yomg'ir",
  "thunderstorm": "Momaqaldiroq",
  "snow": "Qor",
  "light snow": "Yengil qor",
  "heavy snow": "Kuchli qor",
  "shower rain": "Jala",
  "sleet": "Yomg'ir-qor",
  "drizzle": "Shim-shim yomg'ir",
  "mist": "Tuman",
  "fog": "Qalin tuman",
  "haze": "Chang tuman",
};

const directions = [
  "Shimol", "Shimoli-sharq", "Sharq", "Janubi-sharq",
  "Janub", "Janubi-g'arb", "G'arb", "Shimoli-g'arb",
];

function pad(n) { return String(n).padStart(2, "0"); }

let auth, db, rtdb, provider;
let map, marker;
let currentUser = null;
let appReady = false;

async function initFirebase() {
  const res = await fetch(`${BACKEND_URL}/api/config`);
  if (!res.ok) throw new Error("Backend konfiguratsiyasini olib bo'lmadi");
  const firebaseConfig = await res.json();

  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  rtdb = firebase.database();
  provider = new firebase.auth.GoogleAuthProvider();

  bootApp();
}

function bootApp() {
  if (appReady) return;
  appReady = true;

  map = L.map("map", { center: [41.2, 63.5], zoom: 6, zoomControl: true });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  map.on("click", (e) => goToLocation(e.latlng.lat, e.latlng.lng));

  setupHistory();
  setupShareModal();
  setupSearch();
  setupLocateButton();
  setupAuthAndFriends();
  loadFromURL();
}

let locationHistory = [];
let historyBtn, historyTooltip;

function setupHistory() {
  historyBtn = document.getElementById("historyBtn");
  historyTooltip = document.getElementById("historyTooltip");
  locationHistory = JSON.parse(localStorage.getItem("locationHistory") || "[]");

  historyBtn.addEventListener("click", () => {
    if (locationHistory.length < 2) return;
    const prev = locationHistory[1];
    map.setView([prev.lat, prev.lon], 10);
    goToLocation(prev.lat, prev.lon);
  });

  historyBtn.addEventListener("mouseenter", () => {
    if (locationHistory.length > 1) historyTooltip.classList.add("visible");
  });
  historyBtn.addEventListener("mouseleave", () => historyTooltip.classList.remove("visible"));

  updateHistoryBtn();
}

function saveToHistory(lat, lon, name) {
  const isDuplicate = locationHistory.length > 0 &&
    Math.abs(locationHistory[0].lat - lat) < 0.001 &&
    Math.abs(locationHistory[0].lon - lon) < 0.001;

  if (!isDuplicate) {
    locationHistory.unshift({ lat, lon, name });
    if (locationHistory.length > 10) locationHistory.pop();
    localStorage.setItem("locationHistory", JSON.stringify(locationHistory));
  }
  updateHistoryBtn();
}

function updateHistoryBtn() {
  if (locationHistory.length > 1) {
    historyBtn.style.display = "flex";
    historyTooltip.textContent = locationHistory[1].name || "Oldingi joy";
  } else {
    historyBtn.style.display = "none";
  }
}

function goToLocation(lat, lon) {
  if (marker) marker.setLatLng([lat, lon]);
  else marker = L.marker([lat, lon]).addTo(map);
  fetchWeather(lat, lon);
}

function fetchWeather(lat, lon) {
  const loading = document.getElementById("loading");
  loading.style.display = "flex";

  fetch(`${BACKEND_URL}/api/weather?lat=${lat}&lon=${lon}`)
    .then((r) => r.json())
    .then((data) => {
      loading.style.display = "none";

      if (!data || !data.main) {
        document.getElementById("cityName").innerText = "Ma'lumot topilmadi";
        return;
      }

      document.getElementById("placeholder").style.display = "none";
      document.getElementById("weatherContent").style.display = "block";

      const cityName = data.name || "Noma'lum joy";
      document.getElementById("cityName").innerText = cityName;
      document.getElementById("temp").innerText = Math.round(data.main.temp) + "°";

      const rawDesc = data.weather[0].description.toLowerCase();
      document.getElementById("desc").innerText = translations[rawDesc] || rawDesc;

      document.getElementById("feels-like").innerText = Math.round(data.main.feels_like) + "°C";
      document.getElementById("humidity").innerText = data.main.humidity + "%";

      const windSpeed = (data.wind.speed * 3.6).toFixed(1);
      document.getElementById("wind-speed").innerText = windSpeed + " km/h";

      const dir = directions[Math.round((data.wind.deg || 0) / 45) % 8];
      document.getElementById("wind-dir").innerText = dir;

      const sunrise = new Date(data.sys.sunrise * 1000);
      document.getElementById("sunrise").innerText = pad(sunrise.getHours()) + ":" + pad(sunrise.getMinutes());

      const sunset = new Date(data.sys.sunset * 1000);
      document.getElementById("sunset").innerText = pad(sunset.getHours()) + ":" + pad(sunset.getMinutes());

      document.getElementById("coords").innerText = `${lat.toFixed(4)}° N,  ${lon.toFixed(4)}° E`;

      const url = new URL(window.location.href);
      url.searchParams.set("lat", lat.toFixed(6));
      url.searchParams.set("lon", lon.toFixed(6));
      window.history.replaceState(null, "", url.toString());

      saveToHistory(lat, lon, cityName);
      startClock(cityName, data.timezone);
    })
    .catch(() => {
      loading.style.display = "none";
      document.getElementById("cityName").innerText = "Xatolik yuz berdi";
    });
}

let clockInterval = null;

function startClock(cityName, timezoneOffset) {
  const panel = document.getElementById("clockPanel");
  const elTime = document.getElementById("clockTime");
  const elDate = document.getElementById("clockDate");
  const elLocation = document.getElementById("clockLocation");
  const elTz = document.getElementById("clockTz");

  panel.style.display = "block";
  elLocation.textContent = cityName;

  const offsetHours = timezoneOffset / 3600;
  const sign = offsetHours >= 0 ? "+" : "−";
  const absH = Math.abs(Math.floor(offsetHours));
  const absM = Math.abs(Math.round((Math.abs(offsetHours) - absH) * 60));
  elTz.textContent = `UTC ${sign}${pad(absH)}:${pad(absM)}`;

  const weekdays = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

  function tick() {
    const nowUTC = Date.now() + new Date().getTimezoneOffset() * 60000;
    const local = new Date(nowUTC + timezoneOffset * 1000);
    elTime.textContent = `${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}`;
    elDate.textContent = `${weekdays[local.getDay()]}, ${local.getDate()} ${months[local.getMonth()]} ${local.getFullYear()}`;
  }

  if (clockInterval) clearInterval(clockInterval);
  tick();
  clockInterval = setInterval(tick, 1000);
}

function setupShareModal() {
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalClose = document.getElementById("modalClose");
  const modalUrlText = document.getElementById("modalUrlText");
  const modalCopyBtn = document.getElementById("modalCopyBtn");
  const copyBtnLabel = document.getElementById("copyBtnLabel");

  document.getElementById("shareBtn").addEventListener("click", () => {
    modalUrlText.textContent = window.location.href;
    copyBtnLabel.textContent = "Nusxalash";
    modalBackdrop.classList.add("visible");
  });

  function closeModal() { modalBackdrop.classList.remove("visible"); }

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeModal(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.getElementById("addFriendBackdrop")?.classList.remove("visible");
      document.getElementById("nicknameBackdrop")?.classList.remove("visible");
      document.getElementById("loginWarningBackdrop")?.classList.remove("visible");
    }
  });

  modalCopyBtn.addEventListener("click", () => {
    const url = window.location.href;
    const onCopied = () => {
      copyBtnLabel.textContent = "Nusxalandi ✓";
      modalCopyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtnLabel.textContent = "Nusxalash";
        modalCopyBtn.classList.remove("copied");
      }, 2000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(onCopied);
    } else {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      onCopied();
    }
  });

  document.getElementById("telegramBtn").addEventListener("click", () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`, "_blank");
  });
  document.getElementById("whatsappBtn").addEventListener("click", () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`, "_blank");
  });
  document.getElementById("emailBtn").addEventListener("click", () => {
    const city = document.getElementById("cityName").innerText;
    const temp = document.getElementById("temp").innerText;
    window.location.href = `mailto:?subject=${encodeURIComponent(city + " ob-havosi")}&body=${encodeURIComponent(city + " — " + temp + "\n\n" + window.location.href)}`;
  });
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const searchResults = document.getElementById("searchResults");
  let searchTimeout = null;

  function doSearch(q) {
    if (!q) return;
    fetch(`${BACKEND_URL}/api/geocode/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((results) => {
        searchResults.innerHTML = "";
        if (!results.length) {
          searchResults.style.display = "block";
          searchResults.innerHTML = `<div class="search-result-item muted">Natija topilmadi</div>`;
          return;
        }

        searchResults.style.display = "block";
        results.forEach((item) => {
          const div = document.createElement("div");
          div.className = "search-result-item";
          const parts = item.display_name.split(",");
          const main = parts[0].trim();
          const sub = parts.slice(1, 3).join(",").trim();

          div.innerHTML = `<div>${main}</div><div class="result-sub">${sub}</div>`;
          div.addEventListener("click", () => {
            map.setView([parseFloat(item.lat), parseFloat(item.lon)], 10);
            goToLocation(parseFloat(item.lat), parseFloat(item.lon));
            searchResults.style.display = "none";
            searchInput.value = main;
          });

          searchResults.appendChild(div);
        });
      })
      .catch(() => { searchResults.style.display = "none"; });
  }

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 2) { searchResults.style.display = "none"; return; }
    searchTimeout = setTimeout(() => doSearch(q), 400);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { clearTimeout(searchTimeout); doSearch(searchInput.value.trim()); }
  });

  searchBtn.addEventListener("click", () => {
    const q = searchInput.value.trim();
    if (q) doSearch(q);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-bar")) searchResults.style.display = "none";
  });
}

function setupLocateButton() {
  document.getElementById("locateBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Brauzeringiz joylashuvni aniqlamaydi.");
      return;
    }

    const btn = document.getElementById("locateBtn");
    btn.classList.add("active");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 12);
        goToLocation(pos.coords.latitude, pos.coords.longitude);
        btn.classList.remove("active");
      },
      () => {
        btn.classList.remove("active");
        alert("Joylashuv aniqlanmadi. Ruxsat bering.");
      }
    );
  });
}

function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get("lat"));
  const lon = parseFloat(params.get("lon"));
  if (!isNaN(lat) && !isNaN(lon)) {
    map.setView([lat, lon], 10);
    goToLocation(lat, lon);
  }
}

function setupAuthAndFriends() {
  const nicknameBackdrop = document.getElementById("nicknameBackdrop");
  const nicknameInput = document.getElementById("nicknameInput");
  const nicknameSaveBtn = document.getElementById("nicknameSaveBtn");
  const nicknameStatus = document.getElementById("nicknameStatus");
  let nicknameCheckTimeout = null;

  function isValidNickname(n) { return /^[a-zA-Z0-9_\-]{3,20}$/.test(n); }

  nicknameInput.addEventListener("input", () => {
    clearTimeout(nicknameCheckTimeout);
    const val = nicknameInput.value.trim().toLowerCase();
    nicknameSaveBtn.disabled = true;
    nicknameStatus.textContent = "";
    nicknameStatus.className = "nickname-status";
    if (!val) return;

    if (!isValidNickname(val)) {
      nicknameStatus.textContent = "Faqat harf, raqam, _ yoki - ishlatiladi (3-20 ta)";
      nicknameStatus.classList.add("error");
      return;
    }

    nicknameStatus.textContent = "Tekshirilmoqda...";
    nicknameCheckTimeout = setTimeout(async () => {
      const snap = await db.collection("nicknames").doc(val).get();
      if (snap.exists) {
        nicknameStatus.textContent = "Bu nickname band, boshqasini tanla";
        nicknameStatus.classList.add("error");
        nicknameSaveBtn.disabled = true;
      } else {
        nicknameStatus.textContent = "✓ Ishlatish mumkin";
        nicknameStatus.classList.add("success");
        nicknameSaveBtn.disabled = false;
      }
    }, 500);
  });

  nicknameSaveBtn.addEventListener("click", async () => {
    const val = nicknameInput.value.trim().toLowerCase();
    const user = auth.currentUser;
    if (!val || !user) return;

    nicknameSaveBtn.disabled = true;
    nicknameSaveBtn.textContent = "Saqlanmoqda...";

    try {
      const batch = db.batch();
      batch.set(db.collection("nicknames").doc(val), {
        uid: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      batch.update(db.collection("users").doc(user.uid), { nickname: val });
      await batch.commit();

      nicknameBackdrop.classList.remove("visible");
      document.getElementById("authName").textContent = "@" + val;
      nicknameSaveBtn.textContent = "Saqlash";
    } catch (e) {
      nicknameStatus.textContent = "Xatolik yuz berdi, qayta urinib ko'ring";
      nicknameStatus.className = "nickname-status error";
      nicknameSaveBtn.disabled = false;
      nicknameSaveBtn.textContent = "Saqlash";
    }
  });

  async function checkAndShowNicknameModal(user) {
    const snap = await db.collection("users").doc(user.uid).get();
    if (!snap.exists) return;

    const data = snap.data();
    if (!data.nickname) {
      nicknameInput.value = "";
      nicknameStatus.textContent = "";
      nicknameStatus.className = "nickname-status";
      nicknameSaveBtn.disabled = true;
      nicknameBackdrop.classList.add("visible");
    } else {
      document.getElementById("authName").textContent = "@" + data.nickname;
    }
  }

  const authBtn = document.getElementById("authBtn");
  const authBtnLabel = document.getElementById("authBtnLabel");
  const authName = document.getElementById("authName");
  const authAvatar = document.getElementById("authAvatar");
  const friendsPanel = document.getElementById("friendsPanel");
  const loginWarningBackdrop = document.getElementById("loginWarningBackdrop");
  const lwConfirmBtn = document.getElementById("lwConfirmBtn");
  const lwCancelBtn = document.getElementById("lwCancelBtn");

  lwCancelBtn.addEventListener("click", () => loginWarningBackdrop.classList.remove("visible"));
  loginWarningBackdrop.addEventListener("click", (e) => {
    if (e.target === loginWarningBackdrop) loginWarningBackdrop.classList.remove("visible");
  });

  let unsubFriends = null, unsubRequests = null, unsubCurrentUserDoc = null;
  let gpsWatchId = null;
  let friendDocListeners = {};
  let friendPresenceListeners = {};
  let friendMarkers = {};
  let friendPresenceCache = {};
  let presenceRef = null, connectedRef = null, presenceHandlersBound = false;

  async function ensureUserProfileDocument(user) {
    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      const data = {
        uid: user.uid, name: user.displayName, email: user.email, photo: user.photoURL,
        nickname: null, online: false, blocked: false, location: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await userRef.set(data);
      return { ...data, createdAt: true };
    }

    const data = snap.data();
    if (!data.createdAt) {
      await userRef.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    return data;
  }

  function clearFriendPresenceListeners() {
    Object.values(friendPresenceListeners).forEach((u) => u());
    friendPresenceListeners = {};
    friendPresenceCache = {};
  }

  function clearSessionUI() {
    friendsPanel.style.display = "none";
    if (unsubFriends) { unsubFriends(); unsubFriends = null; }
    if (unsubRequests) { unsubRequests(); unsubRequests = null; }
    if (unsubCurrentUserDoc) { unsubCurrentUserDoc(); unsubCurrentUserDoc = null; }

    Object.values(friendDocListeners).forEach((u) => u());
    friendDocListeners = {};
    clearFriendPresenceListeners();

    if (gpsWatchId !== null) { navigator.geolocation.clearWatch(gpsWatchId); gpsWatchId = null; }
    if (connectedRef) { connectedRef.off(); connectedRef = null; }
    if (presenceRef) { presenceRef.onDisconnect().cancel().catch(() => {}); presenceRef = null; }

    Object.values(friendMarkers).forEach((m) => map.removeLayer(m));
    friendMarkers = {};

    document.getElementById("friendsList").innerHTML = '<div class="friends-empty">Hali do\'stlar yo\'q</div>';
    document.getElementById("requestsSection").style.display = "none";
    document.getElementById("requestsList").innerHTML = "";
  }

  async function markOfflineNow(uid) {
    try { await db.collection("users").doc(uid).set({ online: false }, { merge: true }); } catch (e) {}
    try { await rtdb.ref(`/status/${uid}`).set({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP }); } catch (e) {}
  }

  function bindPresenceLifecycle(uid) {
    if (presenceHandlersBound) return;
    presenceHandlersBound = true;
    const goOffline = () => { if (auth.currentUser?.uid === uid) markOfflineNow(uid); };
    window.addEventListener("pagehide", goOffline);
    window.addEventListener("beforeunload", goOffline);
    window.addEventListener("unload", goOffline);
  }

  function startPresence(uid) {
    presenceRef = rtdb.ref(`/status/${uid}`);
    connectedRef = rtdb.ref(".info/connected");

    connectedRef.on("value", (snap) => {
      if (snap.val() !== true) return;
      presenceRef.onDisconnect().set({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
      presenceRef.set({ online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
    });

    bindPresenceLifecycle(uid);
  }

  async function enforceAccountState(user) {
    const data = await ensureUserProfileDocument(user);
    if (data.blocked) {
      await auth.signOut();
      alert("Sizning hisobingiz bloklangan.");
      return false;
    }
    return true;
  }

  function watchOwnAccount(uid) {
    if (unsubCurrentUserDoc) unsubCurrentUserDoc();
    unsubCurrentUserDoc = db.collection("users").doc(uid).onSnapshot(async (docSnap) => {
      if (auth.currentUser?.uid !== uid || !docSnap.exists) return;
      if (docSnap.data().blocked) {
        await auth.signOut();
        alert("Hisobingiz admin tomonidan bloklandi.");
      }
    });
  }

  auth.onAuthStateChanged(async (user) => {
    currentUser = user;

    if (user) {
      const allowed = await enforceAccountState(user);
      if (!allowed) return;

      authBtnLabel.textContent = "Chiqish";
      authAvatar.style.backgroundImage = user.photoURL ? `url(${user.photoURL})` : "";
      authAvatar.style.backgroundSize = "cover";
      authAvatar.style.display = user.photoURL ? "block" : "none";

      authBtn.querySelector("svg").innerHTML =
        `<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;

      friendsPanel.style.display = "block";

      await db.collection("users").doc(user.uid).set(
        { online: true, blocked: false, name: user.displayName, email: user.email, photo: user.photoURL },
        { merge: true }
      ).catch(() => {});

      startPresence(user.uid);
      startGPSTracking(user.uid);
      watchOwnAccount(user.uid);
      await checkAndShowNicknameModal(user);

      if (unsubFriends) unsubFriends();
      if (unsubRequests) unsubRequests();
      Object.values(friendDocListeners).forEach((u) => u());
      friendDocListeners = {};
      clearFriendPresenceListeners();

      unsubFriends = listenFriendsLocations(user.uid);
      unsubRequests = listenFriendRequests(user.uid);
    } else {
      authBtnLabel.textContent = "Kirish";
      authName.textContent = "Akkaunt";
      authAvatar.style.backgroundImage = "";
      authAvatar.style.display = "none";

      authBtn.querySelector("svg").innerHTML =
        `<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;

      clearSessionUI();
    }
  });

  async function doGoogleLogin() {
    loginWarningBackdrop.classList.remove("visible");
    try {
      const result = await auth.signInWithPopup(provider);
      const data = await ensureUserProfileDocument(result.user);
      if (data.blocked) {
        await auth.signOut();
        alert("Bu hisob bloklangan.");
      }
    } catch (e) {
      console.error("Login xatosi:", e);
    }
  }

  lwConfirmBtn.addEventListener("click", doGoogleLogin);

  authBtn.addEventListener("click", async () => {
    if (currentUser) {
      try {
        await markOfflineNow(currentUser.uid);
        await db.collection("users").doc(currentUser.uid).set({ location: null }, { merge: true });
      } catch (e) {}
      await auth.signOut();
    } else {
      loginWarningBackdrop.classList.add("visible");
    }
  });

  function startGPSTracking(uid) {
    if (!navigator.geolocation) return;
    if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);

    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        fetch(`${BACKEND_URL}/api/geocode/reverse?lat=${lat}&lon=${lon}`)
          .then((r) => r.json())
          .then((data) => {
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Noma'lum joy";
            db.collection("users").doc(uid).update({
              location: { lat, lon, city, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
              online: true,
            }).catch(() => {});
          })
          .catch(() => {
            db.collection("users").doc(uid).update({
              location: { lat, lon, city: `${lat.toFixed(3)}, ${lon.toFixed(3)}`, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
              online: true,
            }).catch(() => {});
          });
      },
      (err) => console.warn("GPS:", err.message),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }

  function listenFriendPresence(uid, onChange) {
    const ref = rtdb.ref(`/status/${uid}`);
    const handler = (snapshot) => { friendPresenceCache[uid] = snapshot.val() || { online: false }; onChange(); };
    ref.on("value", handler);
    return () => { ref.off("value", handler); delete friendPresenceCache[uid]; };
  }

  function listenFriendsLocations(uid) {
    return db.collection("friends").where("users", "array-contains", uid).onSnapshot((snap) => {
      Object.values(friendDocListeners).forEach((u) => u());
      friendDocListeners = {};
      clearFriendPresenceListeners();
      Object.values(friendMarkers).forEach((m) => map.removeLayer(m));
      friendMarkers = {};

      const listEl = document.getElementById("friendsList");
      const seenUids = new Set();
      const friendUids = [];

      for (const d of snap.docs) {
        const fuid = d.data().users.find((u) => u !== uid);
        if (fuid && !seenUids.has(fuid)) { seenUids.add(fuid); friendUids.push(fuid); }
      }

      if (friendUids.length === 0) {
        listEl.innerHTML = '<div class="friends-empty">Hali do\'stlar yo\'q</div>';
        return;
      }

      const friendDataCache = {};

      function rebuildFriendsList() {
        listEl.innerHTML = "";
        Object.values(friendMarkers).forEach((m) => map.removeLayer(m));
        friendMarkers = {};

        let renderedCount = 0, onlineCount = 0;

        for (const fuid of friendUids) {
          const data = friendDataCache[fuid];
          if (!data) continue;
          renderedCount++;

          const nickname = data.nickname ? "@" + data.nickname : data.name;
          const hasLocation = typeof data.location?.lat === "number" && typeof data.location?.lon === "number";
          const isOnline = Boolean(friendPresenceCache[fuid]?.online === true && hasLocation);
          const cityLabel = isOnline ? (data.location.city || "Joy noma'lum") : "Offline";

          const item = document.createElement("div");
          item.className = "friend-item";
          item.setAttribute("data-uid", fuid);
          item.innerHTML = `
            <div class="friend-item-avatar" style="background-image:url(${data.photo || ""});background-size:cover;"></div>
            <div class="friend-item-info">
              <span class="friend-item-name">${nickname}</span>
              <span class="friend-item-city">${cityLabel}</span>
            </div>
            <button class="friend-goto-btn" ${isOnline ? `data-lat="${data.location.lat}" data-lon="${data.location.lon}"` : "disabled"}>→</button>`;
          listEl.appendChild(item);

          item.querySelector(".friend-goto-btn").addEventListener("click", (e) => {
            const lt = parseFloat(e.currentTarget.dataset.lat);
            const ln = parseFloat(e.currentTarget.dataset.lon);
            if (!isNaN(lt) && !isNaN(ln)) map.setView([lt, ln], 14);
          });

          if (!isOnline) continue;
          onlineCount++;
          const { lat, lon, city } = data.location;

          const icon = L.divIcon({
            className: "",
            html: `<div class="friend-marker" title="${nickname}"><img src="${data.photo}" onerror="this.style.display='none'"/></div>`,
            iconSize: [36, 36],
          });

          friendMarkers[fuid] = L.marker([lat, lon], { icon }).addTo(map).bindPopup(`<b>${nickname}</b><br>${city || ""}`);
        }

        if (renderedCount === 0) listEl.innerHTML = '<div class="friends-empty">Hali do\'stlar yo\'q</div>';
        else if (onlineCount === 0) listEl.insertAdjacentHTML("beforeend", '<div class="friends-empty">Barcha do\'stlar hozir offline</div>');
      }

      for (const fuid of friendUids) {
        friendDocListeners[fuid] = db.collection("users").doc(fuid).onSnapshot((docSnap) => {
          if (!docSnap.exists) return;
          friendDataCache[fuid] = docSnap.data();
          rebuildFriendsList();
        });
        friendPresenceListeners[fuid] = listenFriendPresence(fuid, rebuildFriendsList);
      }
    });
  }

  function listenFriendRequests(uid) {
    return db.collection("friendRequests").where("to", "==", uid).where("status", "==", "pending").onSnapshot(async (snap) => {
      const requestsSection = document.getElementById("requestsSection");
      const requestsList = document.getElementById("requestsList");

      if (snap.empty) { requestsSection.style.display = "none"; return; }

      requestsSection.style.display = "block";
      requestsList.innerHTML = "";

      for (const d of snap.docs) {
        const data = d.data();
        const fromSnap = await db.collection("users").doc(data.from).get();
        const fromUser = fromSnap.data();
        const nickname = fromUser?.nickname ? "@" + fromUser.nickname : fromUser?.name || "Noma'lum";

        const div = document.createElement("div");
        div.className = "request-item";
        div.innerHTML = `
          <span class="request-name">${nickname}</span>
          <div class="request-actions">
            <button class="req-accept" data-id="${d.id}" data-from="${data.from}">✓</button>
            <button class="req-decline" data-id="${d.id}">✕</button>
          </div>`;
        requestsList.appendChild(div);
      }

      requestsList.querySelectorAll(".req-accept").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const rid = btn.dataset.id;
          const from = btn.dataset.from;
          const toUid = currentUser.uid;

          await db.collection("friendRequests").doc(rid).update({ status: "accepted" });
          await db.collection("friends").doc(`${from}_${toUid}`).set({ users: [from, toUid], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
          await db.collection("friends").doc(`${toUid}_${from}`).set({ users: [toUid, from], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        });
      });

      requestsList.querySelectorAll(".req-decline").forEach((btn) => {
        btn.addEventListener("click", () => db.collection("friendRequests").doc(btn.dataset.id).delete());
      });
    });
  }

  const addFriendBackdrop = document.getElementById("addFriendBackdrop");

  document.getElementById("friendsAddBtn").addEventListener("click", () => {
    if (!currentUser) return;
    document.getElementById("friendNicknameInput").value = "";
    document.getElementById("friendSearchResult").innerHTML = "";
    addFriendBackdrop.classList.add("visible");
  });

  document.getElementById("addFriendClose").addEventListener("click", () => addFriendBackdrop.classList.remove("visible"));
  addFriendBackdrop.addEventListener("click", (e) => { if (e.target === addFriendBackdrop) addFriendBackdrop.classList.remove("visible"); });

  document.getElementById("friendSearchBtn").addEventListener("click", async () => {
    const val = document.getElementById("friendNicknameInput").value.trim().toLowerCase();
    const result = document.getElementById("friendSearchResult");
    if (!val) return;

    result.textContent = "Qidirilmoqda...";

    const nicknameSnap = await db.collection("nicknames").doc(val).get();
    if (!nicknameSnap.exists) { result.textContent = "Bu nickname topilmadi."; return; }

    const foundUid = nicknameSnap.data().uid;
    if (foundUid === currentUser?.uid) { result.textContent = "Bu siz!"; return; }

    const userSnap = await db.collection("users").doc(foundUid).get();
    const userData = userSnap.data();

    result.innerHTML = `
      <div class="friend-found">
        <div class="friend-found-avatar" style="background-image:url(${userData.photo});background-size:cover;"></div>
        <span>@${val} — ${userData.name}</span>
        <button class="send-req-btn" id="sendReqBtn">So'rov yuborish</button>
      </div>`;

    document.getElementById("sendReqBtn").addEventListener("click", async () => {
      const q = await db.collection("friendRequests").where("from", "==", currentUser.uid).where("to", "==", foundUid).get();
      if (!q.empty) { result.textContent = "So'rov allaqachon yuborilgan."; return; }

      const fSnap = await db.collection("friends").doc(`${currentUser.uid}_${foundUid}`).get();
      if (fSnap.exists) { result.textContent = "Bu odam allaqachon do'stingiz!"; return; }

      await db.collection("friendRequests").add({
        from: currentUser.uid, to: foundUid, status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      result.textContent = "So'rov yuborildi! ✓";
    });
  });
}

initFirebase().catch((err) => {
  console.error("Ilovani ishga tushirishda xatolik:", err);
  alert("Serverga ulanib bo'lmadi. Backend ishlab turganini tekshiring.");
});
