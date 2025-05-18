const express = require("express");
const router = express.Router();
const {
  register,
  loginUser,
  verifyEmail,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../middleware/authMiddleware");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const auth = require("../middleware/auth");

// Register route
router.post("/register", register);

// Login route
router.post("/login", loginUser);

// Verify email route
router.get("/verify-email", verifyEmail);

// Get current user route
router.get("/me", auth, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, phone, role, is_verified FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.json(users[0]);
  } catch (error) {
    console.error("Error getting user info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    try {
      // Buat token JWT
      const token = jwt.sign(
        { id: req.user.id, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Redirect ke frontend dengan token
      res.redirect(`https://blanchedalmond-mongoose-893500.hostingersite.com/login-success?token=${token}`);
    } catch (error) {
      console.error("Error in Google callback:", error);
      res.redirect("https://blanchedalmond-mongoose-893500.hostingersite.com/login?error=authentication_failed");
    }
  }
);

// Forgot password route
router.post("/forgot-password", forgotPassword);

// Reset password route
router.post("/reset-password", resetPassword);

module.exports = router;
