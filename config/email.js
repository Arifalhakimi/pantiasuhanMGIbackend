const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
require("dotenv").config();

let tokenCache = {
  accessToken: null,
  expiry: null,
};

console.log("Checking OAuth2 configuration...");
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Set" : "Not set");
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set"
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set"
);
console.log(
  "OAUTH_REFRESH_TOKEN:",
  process.env.OAUTH_REFRESH_TOKEN ? "Set" : "Not set"
);

// Validasi environment variables
if (
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.GOOGLE_CLIENT_SECRET ||
  !process.env.OAUTH_REFRESH_TOKEN
) {
  throw new Error(
    "Missing required OAuth2 credentials in environment variables"
  );
}

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

// Log credentials yang digunakan
console.log("Using OAuth2 credentials:");
console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Refresh Token:", process.env.OAUTH_REFRESH_TOKEN);

oauth2Client.setCredentials({
  refresh_token: process.env.OAUTH_REFRESH_TOKEN,
});

const getAccessToken = async () => {
  try {
    if (
      tokenCache.accessToken &&
      tokenCache.expiry &&
      tokenCache.expiry > Date.now() + 300000
    ) {
      console.log("Using cached access token");
      return tokenCache.accessToken;
    }

    console.log("Attempting to refresh access token...");
    const response = await oauth2Client.refreshAccessToken();

    if (!response || !response.credentials) {
      throw new Error("Invalid response from refreshAccessToken");
    }

    const accessToken = response.credentials.access_token;
    if (!accessToken) {
      throw new Error("No access_token in response");
    }

    // Simpan token ke cache
    tokenCache = {
      accessToken: accessToken,
      expiry: Date.now() + (response.credentials.expiry_date - Date.now()),
    };

    console.log("Successfully obtained new access token");
    return accessToken;
  } catch (error) {
    console.error("Error refreshing access token:", error.message);
    if (error.response) {
      console.error(
        "Error response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
};

const createTransporter = async () => {
  try {
    if (!process.env.EMAIL_USER) {
      throw new Error("EMAIL_USER is not configured in environment variables");
    }

    console.log("Creating email transporter...");
    const accessToken = await getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    // Verify transporter configuration
    console.log("Verifying transporter configuration...");
    await transporter.verify();
    console.log("Email transporter configured and verified successfully");

    return transporter;
  } catch (error) {
    console.error("Error creating transporter:", error.message);
    if (error.response) {
      console.error(
        "Error response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw new Error(`Failed to create email transporter: ${error.message}`);
  }
};

module.exports = {
  createTransporter,
  getAccessToken,
};
