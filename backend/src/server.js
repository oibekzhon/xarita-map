require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const configRoutes = require("./routes/config");
const weatherRoutes = require("./routes/weather");
const geocodeRoutes = require("./routes/geocode");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(express.json());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("CORS: bu domenga ruxsat yo'q — " + origin));
    },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "So'rovlar soni chegarasidan oshib ketdi, birozdan keyin urinib ko'ring." },
  })
);

app.get("/api/health", (req, res) => res.json({ status: "ok", app: "xarita-map-backend", time: new Date().toISOString() }));

app.use("/api/config", configRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/geocode", geocodeRoutes);

app.use((req, res) => res.status(404).json({ error: "Endpoint topilmadi." }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Serverda kutilmagan xatolik yuz berdi." });
});

app.listen(PORT, () => {
  console.log(`✅ Xarita backend ${PORT}-portda ishga tushdi (${process.env.NODE_ENV || "development"})`);
});
