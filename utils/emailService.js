const { createTransporter } = require("../config/email");
require("dotenv").config();

const sendVerificationEmail = async (toEmail, verificationLink) => {
  try {
    const transporter = await createTransporter();

    // Log untuk debugging
    console.log("Sending verification email to:", toEmail);
    console.log("Verification link:", verificationLink);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: "Verifikasi Email - Panti Asuhan Masjid Gelora Indah",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Verifikasi Email Anda</h2>
          <p>Terima kasih telah mendaftar di Panti Asuhan Masjid Gelora Indah. Untuk menyelesaikan proses registrasi, silakan klik tombol di bawah ini:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verifikasi Email
            </a>
          </div>
          <p>Jika tombol di atas tidak berfungsi, Anda dapat menyalin dan menempelkan link berikut di browser Anda:</p>
          <p style="word-break: break-all;">${verificationLink}</p>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            Email ini dikirim secara otomatis, mohon tidak membalas email ini.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email verifikasi berhasil dikirim.");
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

const sendOTPEmail = async (toEmail, otp) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: "Kode OTP Reset Password - Panti Asuhan Masjid Gelora Indah",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Reset Password</h2>
          <p>Anda telah meminta untuk mereset password Anda. Berikut adalah kode OTP Anda:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
              ${otp}
            </div>
          </div>
          <p>Kode OTP ini akan kadaluarsa dalam 5 menit.</p>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            Email ini dikirim secara otomatis, mohon tidak membalas email ini.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email OTP berhasil dikirim.");
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendOTPEmail,
};
