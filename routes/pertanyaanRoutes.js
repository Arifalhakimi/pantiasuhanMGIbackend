const express = require("express");
const router = express.Router();
const PertanyaanController = require("../controllers/PertanyaanController");

// Ambil semua pertanyaan
router.get("/", PertanyaanController.getAllPertanyaan);

// Kirim pertanyaan baru
router.post("/", PertanyaanController.createPertanyaan);

module.exports = router;
