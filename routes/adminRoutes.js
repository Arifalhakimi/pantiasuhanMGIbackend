const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService");

// Get all users
router.get("/users", verifyToken, isAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, phone, role FROM users"
    );
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Gagal mengambil data user" });
  }
});

// Delete user
router.delete("/users/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Cek apakah user ada
    const [user] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);

    if (user.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User tidak ditemukan",
      });
    }

    // Mulai transaksi
    await db.query("START TRANSACTION");

    try {
      // Hapus data terkait di tabel donations
      await db.query("DELETE FROM donations WHERE user_id = ?", [userId]);

      // Hapus user
      await db.query("DELETE FROM users WHERE id = ?", [userId]);

      // Commit transaksi
      await db.query("COMMIT");

      res.json({
        status: "success",
        message: "User berhasil dihapus",
      });
    } catch (error) {
      // Rollback jika terjadi error
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      status: "error",
      message:
        "Gagal menghapus user. User mungkin memiliki data donasi yang perlu dihapus terlebih dahulu.",
    });
  }
});

// Register new user (admin only)
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Validasi input
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "Semua field harus diisi" });
    }

    // Cek format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }

    // Cek apakah email sudah terdaftar
    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email sudah terdaftar" });
    }

    // Cek apakah ini user pertama
    const [users] = await db.query("SELECT COUNT(*) as count FROM users");
    const isFirstUser = users[0].count === 0;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Tentukan role user
    let userRole = role;
    if (isFirstUser) {
      userRole = "admin";
    }

    // Simpan user baru dengan status belum terverifikasi
    const [result] = await db.query(
      "INSERT INTO users (name, email, phone, password, role, is_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, email, phone, hashedPassword, userRole, false, verificationToken]
    );

    // Buat link verifikasi
    const frontendUrl = process.env.FRONTEND_URL.trim();
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // Kirim email verifikasi
    await sendVerificationEmail(email, verificationLink);

    res.status(201).json({
      message: "Registrasi berhasil. Silakan cek email Anda untuk verifikasi.",
      isFirstUser: isFirstUser,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Gagal mendaftarkan user" });
  }
});

module.exports = router;
