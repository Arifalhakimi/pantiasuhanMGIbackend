require("dotenv").config();
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
const db = require("./db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        // Cari user berdasarkan email
        const [existingUser] = await db.query(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );

        if (existingUser.length > 0) {
          return done(null, existingUser[0]);
        }

        // Jika belum ada, simpan user baru
        const [result] = await db.query(
          "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
          [name, email, "", "user"]
        );

        const newUser = { id: result.insertId, name, email };
        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize dan deserialize
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
  done(null, rows[0]);
});
