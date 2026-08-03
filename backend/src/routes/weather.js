const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

// GET /api/weather?lat=..&lon=..
router.get("/", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
    return res.status(400).json({ error: "lat va lon parametrlari to'g'ri berilishi kerak." });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data.message || "Ob-havo ma'lumotini olishda xatolik." });
    }

    res.json(data);
  } catch (err) {
    console.error("Weather proxy xatosi:", err.message);
    res.status(502).json({ error: "Ob-havo xizmatiga ulanib bo'lmadi." });
  }
});

module.exports = router;
