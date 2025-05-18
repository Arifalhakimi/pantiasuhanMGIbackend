const midtransClient = require("midtrans-client");

// Validasi environment variables
if (!process.env.MIDTRANS_SERVER_KEY) {
  throw new Error(
    "MIDTRANS_SERVER_KEY tidak ditemukan di environment variables"
  );
}

if (!process.env.MIDTRANS_CLIENT_KEY) {
  throw new Error(
    "MIDTRANS_CLIENT_KEY tidak ditemukan di environment variables"
  );
}

// Konfigurasi Snap
const snap = new midtransClient.Snap({
  isProduction: false, // Mode sandbox
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const createToken = async (donationData) => {
  console.log(
    "Data donasi yang diterima:",
    JSON.stringify(donationData, null, 2)
  );

  // Validasi data donasi
  if (!donationData.order_id) {
    throw new Error("Order ID tidak ditemukan");
  }

  if (!donationData.amount || isNaN(donationData.amount)) {
    throw new Error("Amount tidak valid");
  }

  if (!donationData.name) {
    throw new Error("Nama tidak ditemukan");
  }

  if (!donationData.email) {
    throw new Error("Email tidak ditemukan");
  }

  const parameter = {
    transaction_details: {
      order_id: donationData.order_id,
      gross_amount: parseInt(donationData.amount),
    },
    customer_details: {
      first_name: donationData.name,
      email: donationData.email,
      phone: donationData.phone || "",
    },
    item_details: [
      {
        id: "DONATION",
        price: parseInt(donationData.amount),
        quantity: 1,
        name: "Donasi Panti Asuhan",
      },
    ],
    credit_card: {
      secure: true,
    },
    enabled_payments: ["credit_card", "bank_transfer", "gopay", "shopeepay"],
    callbacks: {
      finish: `https://backend-pantiasuhan-bhhhgnhjhshxczhd.indonesiacentral-01.azurewebsites.net/api/donations/status/${donationData.order_id}`,
      error: `https://backend-pantiasuhan-bhhhgnhjhshxczhd.indonesiacentral-01.azurewebsites.net/api/donations/status/${donationData.order_id}`,
      pending: `https://backend-pantiasuhan-bhhhgnhjhshxczhd.indonesiacentral-01.azurewebsites.net/api/donations/status/${donationData.order_id}`,
    },
  };

  try {
    console.log(
      "Parameter yang dikirim ke Midtrans:",
      JSON.stringify(parameter, null, 2)
    );

    // Test koneksi ke Midtrans
    const testConnection = await snap.apiConfig.get();
    console.log("Test koneksi Midtrans berhasil:", testConnection);

    // Buat transaksi
    const transaction = await snap.createTransaction(parameter);
    console.log("🔁 Midtrans Snap URL:", transaction.redirect_url);
    console.log("Token:", transaction.token);

    return transaction;
  } catch (err) {
    console.error("❌ Midtrans error:", err);
    console.error("Detail error:", err.message);
    console.error("Stack trace:", err.stack);
    throw new Error(`Gagal membuat token Midtrans: ${err.message}`);
  }
};

module.exports = { createToken };
