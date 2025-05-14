const db = require("../config/db");

class Pertanyaan {
  static async create(data) {
    const { name, email, subjek, message } = data;
    const query = `
      INSERT INTO pertanyaan (name, email, subjek, message)
      VALUES (?, ?, ?, ?)
    `;
    try {
      const [result] = await db.execute(query, [name, email, subjek, message]);
      return {
        id: result.insertId,
        name,
        email,
        subjek,
        message,
        created_at: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    const query = "SELECT * FROM pertanyaan ORDER BY created_at DESC";
    try {
      const [rows] = await db.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Pertanyaan;
