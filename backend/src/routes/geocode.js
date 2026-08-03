const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const LOCATIONIQ_BASE = "https://us1.locationiq.com/v1";

// GET /api/geocode/search?q=Tashkent
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.json([]);

  try {
    const url = `${LOCATIONIQ_BASE}/search?key=${process.env.LOCATIONIQ_API_KEY}&q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=uz`;
    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      // LocationIQ natija topilmasa 404 qaytaradi — bu xato emas, bo'sh ro'yxat
      if (r.status === 404) return res.json([]);
      return res.status(r.status).json({ error: data.error || "Qidiruvda xatolik." });
    }

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
    const url = `${LOCATIONIQ_BASE}/reverse?key=${process.env.LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=uz`;
    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data.error || "Manzil aniqlanmadi." });
    }

    res.json(data);
  } catch (err) {
    console.error("Reverse geocode xatosi:", err.message);
    res.status(502).json({ error: "Manzil aniqlanmadi." });
  }
});

module.exports = router;
