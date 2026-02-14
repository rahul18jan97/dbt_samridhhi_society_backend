const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

const app = express();
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT now()");
    res.json({
      success: true,
      db_time: result.rows[0].now
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/invoices", express.static("invoices"));

module.exports = app;
