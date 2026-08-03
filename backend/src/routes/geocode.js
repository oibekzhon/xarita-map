const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const NOMINATIM_HEADERS = {
  "User-Agent": "XaritaObHavo/1.0 (contact: support@example.com)",
};

// GET /api/geocode/search?q=Tashkent
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.json([]);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=uz`;
    const r = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("Geocode search xatosi:", err.message);
    res.status(502).json({ error: "Qidiruv xizmatiga ulanib bo'lmadi." });
  }
});

// GET /api/geocode/reverse?lat=..&lon=..
router.get("/reverse", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat va lon kerak." });

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=uz`;
    const r = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("Reverse geocode xatosi:", err.message);
    res.status(502).json({ error: "Manzil aniqlanmadi." });
  }
});

module.exports = router;
