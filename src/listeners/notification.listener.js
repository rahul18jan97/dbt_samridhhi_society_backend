const pool = require("../config/db");
const admin = require("../config/firebase");

async function processNotification(notificationId) {
  try {
    // 1️⃣ Fetch notification
    const { rows } = await pool.query(
      `
      SELECT *
      FROM tb_notification_master
      WHERE notification_id = $1
        AND is_active = true
      `,
      [notificationId]
    );

    if (!rows.length) return;

    const n = rows[0];

    // 2️⃣ Fetch target users
    let query = `
      SELECT push_token
      FROM tb_emp_login_auth
      WHERE push_token IS NOT NULL
    `;
    let params = [];

    if (n.target_type === "USER" && n.target_mobile) {
      query += ` AND mobile_number = $1`;
      params.push(n.target_mobile);
    }

    const users = await pool.query(query, params);
    if (!users.rows.length) return;

    // 3️⃣ Send FCM
    for (const u of users.rows) {
      await admin.messaging().send({
        token: u.push_token,
        notification: {
          title: n.title,
          body: n.message_template,
        },
        data: {
          type: n.notification_type || "GENERAL",
          notification_id: String(n.notification_id),
        },
      });
    }

    console.log("✅ FCM sent:", notificationId);

  } catch (err) {
    console.error("❌ Notification Error:", err);
  }
}

module.exports = { processNotification };


// async function processNotification(notificationId) {
//   try {
//     // 1️⃣ Fetch notification
//     const { rows } = await pool.query(
//       `
//       SELECT *
//       FROM tb_notification_master
//       WHERE notification_id = $1
//         AND is_active = true
//       `,
//       [notificationId]
//     );

//     if (rows.length === 0) return;

//     const n = rows[0];

//     // 2️⃣ Decide target users
//     let userQuery = `
//       SELECT push_token
//       FROM tb_emp_login_auth
//       WHERE push_token IS NOT NULL
//     `;
//     const params = [];

//     if (n.target_type === "USER" && n.target_mobile) {
//       userQuery += " AND mobile_number = $1";
//       params.push(n.target_mobile);
//     }

//     const users = await pool.query(userQuery, params);
//     if (users.rows.length === 0) return;

//     // 3️⃣ Send push
//     for (const u of users.rows) {
//       await admin.messaging().send({
//         token: u.push_token,
//         notification: {
//           title: n.title,
//           body: n.message_template,
//         },
//         data: {
//           type: n.notification_type || "GENERAL",
//           notification_id: String(n.notification_id),
//         },
//       });
//     }

//     console.log("✅ Notification sent:", n.notification_id);

//   } catch (err) {
//     console.error("❌ Notification error:", err);
//   }
// }

// module.exports = { processNotification };
