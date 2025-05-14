const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: "Token tidak ditemukan" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Format token tidak valid" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ error: "Token tidak valid atau telah kadaluarsa" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Akses ditolak. Hanya admin yang diizinkan" });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
