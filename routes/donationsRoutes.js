const express = require("express");
const router = express.Router();
const { createToken } = require("../utils/midtrans");
const db = require("../config/db");
const crypto = require("crypto");
const { verifyToken } = require("../middleware/authMiddleware");

// Route untuk mendapatkan semua donasi
router.get("/", async (req, res) => {
  try {
    const [donations] = await db.query(`
      SELECT 
        id, 
        user_id, 
        name, 
        email, 
        phone, 
        amount, 
        message,
        payment_type, 
        transaction_id, 
        order_id, 
        status, 
        created_at, 
        updated_at 
      FROM donations 
      ORDER BY created_at DESC
    `);
    res.json(donations);
  } catch (error) {
    console.error("Error mengambil data donasi:", error);
    res.status(500).json({ error: "Gagal mengambil data donasi" });
  }
});

router.post("/donate", async (req, res) => {
  const { user_id, amount, name, email, phone, message } = req.body;
  console.log("Request body:", req.body);

  if (!amount || !name || !email) {
    return res.status(400).json({ error: "Data donasi tidak lengkap" });
  }

  const order_id = `DONASI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const donationData = {
    order_id,
    amount: parseInt(amount),
    name,
    email,
    phone: phone || "",
    message: message || "",
  };

  try {
    // Simpan data donasi ke database terlebih dahulu
    const sql = `
      INSERT INTO donations 
      (user_id, name, email, phone, amount, message, order_id, status, payment_type, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      user_id || null,
      name,
      email,
      phone || null,
      amount,
      message || null,
      order_id,
      "pending",
      "midtrans",
    ];

    console.log("SQL Query:", sql);
    console.log("Values:", values);

    const [result] = await db.query(sql, values);
    console.log(
      "Data donasi berhasil disimpan ke database. ID:",
      result.insertId
    );

    // Verifikasi data yang baru saja disimpan
    const [verifyData] = await db.query(
      "SELECT * FROM donations WHERE id = ?",
      [result.insertId]
    );
    console.log("Data yang tersimpan:", verifyData);

    // Setelah data tersimpan, buat token Midtrans
    console.log("Membuat token Midtrans dengan data:", donationData);
    const response = await createToken(donationData);
    console.log("🔗 Redirect URL dari Snap:", response.redirect_url);

    // Update transaction_id di database
    await db.query("UPDATE donations SET transaction_id = ? WHERE id = ?", [
      response.token,
      result.insertId,
    ]);

    // Kirim response dengan redirect_url
    res.status(200).json({
      message: "Donasi berhasil dibuat",
      redirect_url: response.redirect_url,
      order_id: order_id,
      token: response.token,
    });
  } catch (error) {
    console.error("Error:", error);
    // Jika terjadi error, hapus data yang sudah tersimpan
    if (order_id) {
      try {
        await db.query("DELETE FROM donations WHERE order_id = ?", [order_id]);
        console.log("Data donasi berhasil dihapus karena error");
      } catch (deleteError) {
        console.error("Error menghapus data:", deleteError);
      }
    }
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk menerima notifikasi dari Midtrans
router.post("/notification", async (req, res) => {
  try {
    console.log("=== NOTIFIKASI MIDTRANS DITERIMA ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("IP Address:", req.ip);
    console.log("User Agent:", req.headers["user-agent"]);
    console.log("Content Type:", req.headers["content-type"]);
    console.log("Raw Body:", req.body);

    const notificationJson = req.body;
    console.log("Headers:", req.headers);
    console.log("Body:", JSON.stringify(notificationJson, null, 2));

    if (!notificationJson) {
      console.error("Body notifikasi kosong");
      return res.status(400).json({ error: "Body notifikasi kosong" });
    }

    // Verifikasi signature
    const signatureKey = process.env.MIDTRANS_SERVER_KEY;
    const orderId = notificationJson.order_id;
    const statusCode = notificationJson.status_code;
    const grossAmount = notificationJson.gross_amount;
    const signature = notificationJson.signature_key;

    console.log("=== DETAIL VERIFIKASI ===");
    console.log("Order ID:", orderId);
    console.log("Status Code:", statusCode);
    console.log("Gross Amount:", grossAmount);
    console.log("Signature:", signature);
    console.log("Server Key:", signatureKey);

    // Generate signature untuk verifikasi
    const expectedSignature = crypto
      .createHash("sha512")
      .update(orderId + statusCode + grossAmount + signatureKey)
      .digest("hex");

    console.log("Expected Signature:", expectedSignature);
    console.log("Signature Match:", signature === expectedSignature);

    if (signature !== expectedSignature) {
      console.error("Signature tidak valid");
      return res.status(400).json({ error: "Signature tidak valid" });
    }

    // Update status transaksi di database
    const transactionStatus = notificationJson.transaction_status;
    const paymentType = notificationJson.payment_type;
    const transactionId = notificationJson.transaction_id;

    console.log("=== STATUS TRANSAKSI ===");
    console.log("Transaction Status:", transactionStatus);
    console.log("Payment Type:", paymentType);
    console.log("Transaction ID:", transactionId);

    let status = "pending";
    switch (transactionStatus) {
      case "capture":
      case "settlement":
        status = "success";
        break;
      case "deny":
      case "cancel":
        status = "failed";
        break;
      case "expire":
        status = "expired";
        break;
      case "pending":
        // Cek apakah transaksi sudah melewati batas waktu
        const [donation] = await db.query(
          "SELECT created_at FROM donations WHERE order_id = ?",
          [orderId]
        );

        if (donation && donation[0]) {
          const createdTime = new Date(donation[0].created_at);
          const currentTime = new Date();
          const timeDiff = (currentTime - createdTime) / (1000 * 60); // dalam menit

          // Jika lebih dari 24 jam (1440 menit), update status menjadi expired
          if (timeDiff > 2) {
            status = "expired";
          }
        }
        break;
    }

    console.log("Status yang akan diupdate:", status);

    // Update data di database
    const [result] = await db.query(
      `UPDATE donations 
       SET status = ?, 
           payment_type = ?, 
           transaction_id = ?, 
           updated_at = NOW() 
       WHERE order_id = ?`,
      [status, paymentType, transactionId, orderId]
    );

    console.log("=== HASIL UPDATE DATABASE ===");
    console.log("Rows affected:", result.affectedRows);
    console.log(`Status transaksi ${orderId} diperbarui menjadi ${status}`);
    console.log(`Metode pembayaran: ${paymentType}`);
    console.log(`Transaction ID: ${transactionId}`);

    // Verifikasi update
    const [updatedDonation] = await db.query(
      "SELECT * FROM donations WHERE order_id = ?",
      [orderId]
    );
    console.log("Data setelah update:", updatedDonation);

    res.status(200).json({ message: "Notifikasi berhasil diproses" });
  } catch (error) {
    console.error("Error memproses notifikasi:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ error: "Gagal memproses notifikasi" });
  }
});

// Endpoint untuk mengecek status transaksi
router.get("/status/:order_id", async (req, res) => {
  try {
    const { order_id } = req.params;
    const { transaction_status, status_code } = req.query;

    console.log("=== STATUS CALLBACK DITERIMA ===");
    console.log("Order ID:", order_id);
    console.log("Transaction Status:", transaction_status);
    console.log("Status Code:", status_code);

    // Update status di database jika ada
    if (transaction_status) {
      let status = "pending";
      switch (transaction_status) {
        case "capture":
        case "settlement":
          status = "success";
          break;
        case "deny":
        case "cancel":
          status = "failed";
          break;
        case "expire":
          status = "expired";
          break;
      }

      await db.query(
        `UPDATE donations 
         SET status = ?, 
             updated_at = NOW() 
         WHERE order_id = ?`,
        [status, order_id]
      );

      console.log(`Status transaksi ${order_id} diperbarui menjadi ${status}`);
    }

    // Redirect ke halaman utama frontend
    res.redirect("https://pantiasuhanmgi.my.id");
  } catch (error) {
    console.error("Error:", error);
    // Redirect ke halaman utama meskipun ada error
    res.redirect("https://pantiasuhanmgi.my.id");
  }
});

// mendapatkan endpoint riwayat donasi dari user yang login
router.get("/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      "SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Gagal ambil riwayat donasi:", error);
    res.status(500).json({ error: "Gagal ambil riwayat donasi" });
  }
});

module.exports = router;
