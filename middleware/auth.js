const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: "Tidak ada token, akses ditolak" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token tidak valid" });
  }
};
