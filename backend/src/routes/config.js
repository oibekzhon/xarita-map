const express = require("express");
const router = express.Router();

// GET /api/config — Firebase Web SDK konfiguratsiyasini .env dan beradi.
// Eslatma: bu qiymatlar brauzerda ishlashi shart bo'lgan public config,
// haqiqiy himoya Firestore/RTDB Security Rules orqali ta'minlanadi.
router.get("/", (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
});

module.exports = router;
