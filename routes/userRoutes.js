const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const db = require("../config/db");

router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db.query("SELECT id, name, email, phone FROM users WHERE id = ?", [userId]);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    res.json(user[0]);
  } catch (error) {
    console.error("Error saat ambil data user:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

module.exports = router;
