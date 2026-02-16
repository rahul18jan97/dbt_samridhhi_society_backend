const pool = require("../config/db");

async function createNotification(req, res) {
  try {
    const { title, message_template, notification_type } = req.body;

    const result = await pool.query(
      `INSERT INTO tb_notification_master
       (title, message_template, notification_type)
       VALUES ($1, $2, $3)
       RETURNING notification_id`,
      [title, message_template, notification_type]
    );

    const notificationId = result.rows[0].notification_id;

    console.log("✅ Notification inserted:", notificationId);

    res.json({
      success: true,
      message: "Notification created successfully",
      notification_id: notificationId
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Error creating notification"
    });
  }
}

module.exports = { createNotification };
