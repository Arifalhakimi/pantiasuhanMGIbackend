const Pertanyaan = require("../models/Pertanyaan");

exports.createPertanyaan = async (req, res) => {
  try {
    const { name, email, subjek, message } = req.body;

    if (!name || !email || !subjek || !message) {
      return res.status(400).json({
        status: "error",
        message: "Semua field harus diisi",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Format email tidak valid",
      });
    }

    const result = await Pertanyaan.create({
      name,
      email,
      subjek,
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Pertanyaan berhasil dikirim",
      data: result,
    });
  } catch (error) {
    console.error("Error in createPertanyaan:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengirim pertanyaan",
    });
  }
};

exports.getAllPertanyaan = async (req, res) => {
  try {
    const pertanyaans = await Pertanyaan.getAll();
    res.status(200).json(pertanyaans); // frontend kemungkinan expect array langsung
  } catch (error) {
    console.error("Error in getAllPertanyaan:", error);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengambil data pertanyaan",
    });
  }
};
