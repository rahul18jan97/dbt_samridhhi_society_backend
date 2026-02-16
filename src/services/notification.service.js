const pool = require("../config/db");
const admin = require("../config/firebase");

async function processNotification(notificationId) {
  try {

    console.log("🔔 Processing notification:", notificationId);

    // 1️⃣ Get notification data
    const { rows } = await pool.query(
      `SELECT *
       FROM tb_notification_master
       WHERE notification_id = $1
       AND is_active = true`,
      [notificationId]
    );

    if (!rows.length) {
      console.log("❌ Notification not found");
      return;
    }

    const notification = rows[0];

    // 2️⃣ Get all user tokens
    const users = await pool.query(
      `SELECT push_token
       FROM tb_emp_login_auth
       WHERE push_token IS NOT NULL`
    );

    if (!users.rows.length) {
      console.log("❌ No users found");
      return;
    }

    const tokens = users.rows.map(u => u.push_token);

    console.log("📱 Sending to tokens:", tokens.length);

    // 3️⃣ Send notification using multicast
    const response = await admin.messaging().sendEachForMulticast({

      tokens: tokens,

      notification: {
        title: notification.title,
        body: notification.message_template,
      },

      data: {
        type: notification.notification_type || "GENERAL",
        notification_id: String(notification.notification_id),
      },

      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default_channel"
        }
      }

    });

    console.log("✅ Notification sent successfully");
    console.log("Success:", response.successCount);
    console.log("Failed:", response.failureCount);

  } catch (error) {

    console.error("❌ Notification error:", error);

  }
}

module.exports = {
  processNotification
};
