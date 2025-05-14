const express = require("express");
const router = express.Router();
const midtransClient = require("midtrans-client");
const db = require("../config/db"); // sesuaikan path koneksi db kamu

const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Webhook Midtrans
router.post("/payment-notification", async (req, res) => {
  try {
    console.log("Webhook Midtrans diterima:", req.body);
    const statusResponse = await core.transaction.notification(req.body);
    const { transaction_status, order_id, fraud_status, transaction_id } =
      statusResponse;

    console.log("Status transaksi:", transaction_status);
    console.log("Order ID:", order_id);
    console.log("Fraud status:", fraud_status);
    console.log("Transaction ID:", transaction_id);

    // Update status donasi di database
    const [result] = await db.query(
      "UPDATE donations SET status = ?, transaction_id = ? WHERE order_id = ?",
      [transaction_status, transaction_id, order_id]
    );

    if (result.affectedRows === 0) {
      console.error("Donasi tidak ditemukan untuk order_id:", order_id);
    } else {
      console.log("Status donasi berhasil diupdate");
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error notifikasi Midtrans:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Manual cek status transaksi
router.get("/cek-status/:order_id", async (req, res) => {
  try {
    const orderId = req.params.order_id;
    const response = await core.transaction.status(orderId);
    res.json(response);
  } catch (error) {
    console.error("Error cek status:", error);
    res.status(500).send("Gagal cek status");
  }
});

router.get("/donations", async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT id, name, email, amount, status, created_at FROM donations ORDER BY created_at DESC"
    );
    res.json(results);
  } catch (error) {
    console.error("Gagal ambil data donasi:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
