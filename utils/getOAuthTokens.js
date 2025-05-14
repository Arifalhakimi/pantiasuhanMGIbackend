const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
require("dotenv").config();

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // Gunakan OAuth Playground sebagai callback
);

// Generate URL untuk mendapatkan authorization code
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://mail.google.com/"],
  prompt: "consent",
  include_granted_scopes: true,
});

console.log("Silakan buka URL berikut di browser Anda:");
console.log(authUrl);
console.log(
  "\nSetelah mengizinkan aplikasi, Anda akan diarahkan ke OAuth Playground"
);
console.log("Di OAuth Playground, Anda akan melihat authorization code");
console.log("Salin code tersebut dan paste di bawah ini:");

// Tunggu input dari user
process.stdin.once("data", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.toString().trim());
    console.log("\nBerhasil mendapatkan tokens:");
    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);

    // Simpan tokens ke .env
    console.log("\nTambahkan ke file .env Anda:");
    console.log(`OAUTH_ACCESS_TOKEN=${tokens.access_token}`);
    console.log(`OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);

    process.exit();
  } catch (error) {
    console.error("Error mendapatkan tokens:", error);
    process.exit(1);
  }
});
