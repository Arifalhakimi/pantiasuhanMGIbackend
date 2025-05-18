const { google } = require("googleapis");
const readline = require("readline");

const oauth2Client = new google.auth.OAuth2(
  "YOUR_CLIENT_ID", // Ganti dengan client ID Anda
  "YOUR_CLIENT_SECRET", // Ganti dengan client secret Anda
  "https://backend-pantiasuhan-bhhhgnhjhshxczhd.indonesiacentral-01.azurewebsites.net/auth/google/callback" // Ganti dengan callback URL Anda
);

const scopes = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
];

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
});

console.log("Silakan buka URL berikut di browser Anda:");
console.log(url);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "Masukkan kode yang Anda dapatkan dari URL di atas: ",
  async (code) => {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log("Refresh Token:", tokens.refresh_token);
      console.log("Access Token:", tokens.access_token);
    } catch (error) {
      console.error("Error mendapatkan token:", error);
    }
    rl.close();
  }
);
