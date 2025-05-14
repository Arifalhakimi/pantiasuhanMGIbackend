const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const crypto = require("crypto");
const {
  sendVerificationEmail,
  sendOTPEmail,
} = require("../utils/emailService");
require("dotenv").config();

// Validasi environment variables
if (!process.env.FRONTEND_URL) {
  console.error("FRONTEND_URL tidak ditemukan di environment variables");
  throw new Error("FRONTEND_URL tidak dikonfigurasi");
}

const registerUser = async (userData) => {
  try {
    console.log("Registering user:", userData);

    // Cek apakah email sudah terdaftar
    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [userData.email]
    );

    if (existingUser.length > 0) {
      throw new Error("Email sudah terdaftar");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Cek apakah ini user pertama (akan menjadi admin)
    const [users] = await db.query("SELECT COUNT(*) as count FROM users");
    const isFirstUser = users[0].count === 0;
    const role = isFirstUser ? "admin" : "user";

    // Simpan user baru
    const [result] = await db.query(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      [userData.name, userData.email, userData.phone, hashedPassword, role]
    );

    console.log("User registered successfully:", result.insertId);
    return {
      message: "Registrasi berhasil",
      userId: result.insertId,
      role: role,
    };
  } catch (error) {
    console.error("Error in registerUser:", error);
    throw error;
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password harus diisi" });
    }

    // Cari user berdasarkan email
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ error: "Email tidak terdaftar" });
    }

    const user = users[0];

    // Cek apakah email sudah diverifikasi
    if (!user.is_verified) {
      return res.status(401).json({
        error: "Email belum diverifikasi",
        message: "Silakan cek email Anda untuk melakukan verifikasi",
      });
    }

    // Verifikasi password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Password salah" });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Hapus password dari response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login berhasil",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    res.status(500).json({ error: "Gagal melakukan login" });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Cek apakah ini user pertama (akan menjadi admin)
    const [users] = await db.query("SELECT COUNT(*) as count FROM users");
    const isFirstUser = users[0].count === 0;
    const role = isFirstUser ? "admin" : "user";

    // Simpan user baru dengan status belum terverifikasi
    const [result] = await db.query(
      "INSERT INTO users (name, email, phone, password, role, is_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, email, phone, hashedPassword, role, false, verificationToken]
    );

    // Buat link verifikasi
    const frontendUrl = process.env.FRONTEND_URL.trim();
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    console.log("Verification link:", verificationLink);

    // Kirim email verifikasi
    await sendVerificationEmail(email, verificationLink);

    res.status(201).json({
      message: "Registrasi berhasil. Silakan cek email Anda untuk verifikasi.",
    });
  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).json({ error: "Gagal mendaftarkan user" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    console.log("Verification token received:", token);

    if (!token) {
      return res
        .status(400)
        .json({ error: "Token verifikasi tidak ditemukan" });
    }

    // Cari user berdasarkan verification_token
    const [users] = await db.query(
      "SELECT * FROM users WHERE verification_token = ?",
      [token]
    );

    console.log("Users found:", users.length);

    if (users.length === 0) {
      return res.status(400).json({
        error: "Token verifikasi tidak valid",
        message: "Token yang Anda gunakan tidak valid atau sudah kedaluwarsa",
      });
    }

    const user = users[0];

    // Update status verifikasi user
    await db.query(
      "UPDATE users SET is_verified = true, verification_token = NULL WHERE id = ?",
      [user.id]
    );

    console.log("User verified successfully:", user.email);

    res.status(200).json({
      message: "Email berhasil diverifikasi",
      redirectUrl: `${process.env.FRONTEND_URL}/login`,
    });
  } catch (error) {
    console.error("Error in verifyEmail:", error);
    res.status(500).json({
      error: "Gagal memverifikasi email",
      message: "Terjadi kesalahan saat memverifikasi email Anda",
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    // Cari user berdasarkan ID dari token
    const [users] = await db.query(
      "SELECT id, name, email, phone, role, is_verified FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.json(users[0]);
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mengambil data user" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validasi input
    if (!email) {
      return res.status(400).json({ error: "Email harus diisi" });
    }

    // Cari user berdasarkan email
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ error: "Email tidak terdaftar" });
    }

    // Generate OTP 6 digit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    // Simpan OTP ke database
    await db.query(
      "UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE email = ?",
      [otp, otpExpiry, email]
    );

    // Kirim email OTP
    await sendOTPEmail(email, otp);

    res.status(200).json({
      message: "Kode OTP telah dikirim ke email Anda",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ error: "Gagal mengirim kode OTP" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, otp } = req.body;

    // Validasi input
    if (!email || !newPassword || !otp) {
      return res.status(400).json({ error: "Semua field harus diisi" });
    }

    // Cari user berdasarkan email
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? AND reset_otp = ? AND reset_otp_expiry > NOW()",
      [email, otp]
    );

    if (users.length === 0) {
      return res
        .status(400)
        .json({ error: "Kode OTP tidak valid atau sudah kadaluarsa" });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password dan hapus OTP
    await db.query(
      "UPDATE users SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL WHERE email = ?",
      [hashedPassword, email]
    );

    res.status(200).json({
      message: "Password berhasil diubah",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ error: "Gagal mengubah password" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  register,
  verifyEmail,
  getCurrentUser,
  forgotPassword,
  resetPassword,
};
