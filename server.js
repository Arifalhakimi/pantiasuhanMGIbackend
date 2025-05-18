require("dotenv").config();
const passport = require("passport");
const session = require("express-session");
require("./config/passport");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const donationsRoutes = require("./routes/donationsRoutes");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./routes/adminRoutes");
const pertanyaanRoutes = require("./routes/pertanyaanRoutes");

const app = express();

// Middleware untuk logging
app.use(morgan("dev"));

// Konfigurasi CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://blanchedalmond-mongoose-893500.hostingersite.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Konfigurasi body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Konfigurasi session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "rahasia",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 jam
    },
  })
);

// Inisialisasi passport
app.use(passport.initialize());
app.use(passport.session());

// Test koneksi database
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ Koneksi database berhasil");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Gagal terhubung ke database:", err);
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/donations", donationsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pertanyaan", pertanyaanRoutes);

// Endpoint untuk testing notifikasi Midtrans
app.post("/api/donations/notification", (req, res) => {
  console.log("Notifikasi diterima:", req.body);
  res.status(200).send("OK");
});

// Tambahkan handler untuk root URL
app.get("/", (req, res) => {
  res.send("🎉 Backend API berjalan dengan baik!");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    message: "Terjadi kesalahan server",
    error: err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
