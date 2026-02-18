const { Client } = require("pg");
const pool = require("../config/db");
const { sendPush } = require("../services/push.service");

async function startNotificationListener() {

  const client = new Client({
    connectionString: process.env.DIRECT_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("✅ Connected to DB (DIRECT)");

  await client.query("LISTEN new_notification");
  console.log("👂 Listening for notifications...");

  client.on("notification", async (msg) => {
    try {

      const notificationId = msg.payload;

      const { rows } = await pool.query(
        `SELECT * FROM tb_notification_master
         WHERE notification_id = $1`,
        [notificationId]
      );

      if (rows.length === 0) return;

      const notification = rows[0];

      // ✅ ONLY NORMAL should be instant
      if (notification.notification_type !== "NORMAL") {
        return;
      }

      await processNotification(notification);

      console.log("✅ Instant notification sent:", notificationId);

    } catch (err) {
      console.error("❌ Listener error:", err);
    }
  });
}


/* ================= PROCESS ================= */

async function processNotification(notification) {

  if (notification.target_type === "ALL") {

    const { rows } = await pool.query(`
      SELECT push_token
      FROM tb_emp_login_auth
      WHERE push_token IS NOT NULL
    `);

    const tokens = rows.map(r => r.push_token);

    if (tokens.length > 0) {
      await sendPush(tokens, notification.title, notification.message_template);
    }

  } else if (notification.target_type === "TARGET") {

    const { rows } = await pool.query(`
      SELECT push_token
      FROM tb_emp_login_auth
      WHERE mobile_number = $1
      AND push_token IS NOT NULL
    `, [notification.target_mobile]);

    const tokens = rows.map(r => r.push_token);

    if (tokens.length > 0) {
      await sendPush(tokens, notification.title, notification.message_template);
    }
  }

  await moveToHistory(notification);
}


/* ================= MOVE TO HISTORY ================= */

async function moveToHistory(notification) {

  await pool.query(`
    UPDATE tb_notification_master
    SET notification_status = 'SENT'
    WHERE notification_id = $1
  `, [notification.notification_id]);

  await pool.query(`
    INSERT INTO tb_notification_history
    (
      notification_id,
      title,
      message_template,
      notification_type,
      target_type,
      target_mobile,
      scheduled_at,
      routine_time,
      repeat_type,
      repeat_day_of_week,
      repeat_day_of_month,
      notification_status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'SENT')
  `, [
    notification.notification_id,
    notification.title,
    notification.message_template,
    notification.notification_type,
    notification.target_type,
    notification.target_mobile,
    notification.scheduled_at,
    notification.routine_time,
    notification.repeat_type,
    notification.repeat_day_of_week,
    notification.repeat_day_of_month
  ]);

  await pool.query(`
    DELETE FROM tb_notification_master
    WHERE notification_id = $1
  `, [notification.notification_id]);
}

module.exports = startNotificationListener;



// const { Client } = require("pg");
// const pool = require("../config/db");
// const { sendPush } = require("../services/push.service");

// async function startNotificationListener() {

//   const client = new Client({
//     connectionString: process.env.DIRECT_DATABASE_URL,
//     ssl: { rejectUnauthorized: false }
//   });

//   await client.connect();
//   console.log("✅ Connected to DB (DIRECT)");

//   await client.query("LISTEN new_notification");
//   console.log("👂 Listening for notifications...");

//   client.on("notification", async (msg) => {

//     try {

//       const notificationId = msg.payload;

//       const { rows } = await pool.query(
//         `SELECT * FROM tb_notification_master
//          WHERE notification_id = $1`,
//         [notificationId]
//       );

//       if (rows.length === 0) return;

//       const notification = rows[0];

//       console.log("📢 Trigger received for:", notificationId);

//       // 🔥 SEND BASED ON TYPE
//       if (notification.target_type === "ALL") {
//         await sendToAll(notification);
//       }

//       if (notification.target_type === "TARGET") {
//         await sendToTarget(notification);
//       }

//       // 🔥 ROUTINE should NOT be deleted
//       if (notification.notification_type === "ROUTINE") {
//         await logRoutineExecution(notification.notification_id);
//         return;
//       }

//       // 🔥 Move normal + scheduled to history
//       await moveToHistory(notification);

//       console.log("✅ Notification moved to history:", notificationId);

//     } catch (err) {
//       console.error("❌ Listener processing error:", err);
//     }

//   });

//   client.on("error", (err) => {
//     console.error("❌ Listener error:", err);
//   });
// }

// /* ============================
//    SEND TO ALL
// ============================ */

// async function sendToAll(notification) {

//   const { rows } = await pool.query(
//     `SELECT push_token
//      FROM tb_emp_login_auth
//      WHERE push_token IS NOT NULL`
//   );

//   const tokens = rows.map(r => r.push_token);

//   if (tokens.length === 0) return;

//   await sendPush(tokens, notification.title, notification.message_template);
// }

// /* ============================
//    SEND TO TARGET
// ============================ */

// async function sendToTarget(notification) {

//   const { rows } = await pool.query(
//     `SELECT push_token
//      FROM tb_emp_login_auth
//      WHERE mobile_number = $1
//      AND push_token IS NOT NULL`,
//     [notification.target_mobile]
//   );

//   if (rows.length === 0) return;

//   await sendPush(
//     [rows[0].push_token],
//     notification.title,
//     notification.message_template
//   );
// }

// /* ============================
//    MOVE TO HISTORY + DELETE
// ============================ */

// async function moveToHistory(notification) {

//   await pool.query(
//     `INSERT INTO tb_notification_history
//      (
//        notification_id,
//        title,
//        message_template,
//        notification_type,
//        target_type,
//        target_mobile,
//        scheduled_at,
//        routine_time,
//        notification_status
//      )
//      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'SENT')`,
//     [
//       notification.notification_id,
//       notification.title,
//       notification.message_template,
//       notification.notification_type,
//       notification.target_type,
//       notification.target_mobile,
//       notification.scheduled_at,
//       notification.routine_time
//     ]
//   );

//   await pool.query(
//     `DELETE FROM tb_notification_master
//      WHERE notification_id = $1`,
//     [notification.notification_id]
//   );
// }

// /* ============================
//    ROUTINE EXECUTION LOG
// ============================ */

// async function logRoutineExecution(notificationId) {

//   await pool.query(
//     `INSERT INTO tb_routine_execution_log
//      (notification_id)
//      VALUES ($1)`,
//     [notificationId]
//   );

//   console.log("🔁 Routine executed:", notificationId);
// }

// module.exports = startNotificationListener;
// const { Client } = require("pg");
// const pool = require("../config/db");
// const { sendPush } = require("../services/push.service");

// async function startNotificationListener() {

//   const client = new Client({
//     connectionString: process.env.DIRECT_DATABASE_URL,
//     ssl: { rejectUnauthorized: false }
//   });

//   await client.connect();
//   console.log("✅ Connected to DB (DIRECT)");

//   await client.query("LISTEN new_notification");
//   console.log("👂 Listening for notifications...");

//   client.on("notification", async (msg) => {

//     try {

//       const notificationId = msg.payload;

//       const { rows } = await pool.query(
//         `SELECT * FROM tb_notification_master
//          WHERE notification_id = $1`,
//         [notificationId]
//       );

//       if (rows.length === 0) return;

//       const notification = rows[0];

//       if (notification.notification_type === "NORMAL") {
//    await processNotification(notification);
// }


//       if (notification.target_type === "ALL") {
//         await sendToAll(notification);
//       }

//       if (notification.target_type === "TARGET") {
//         await sendToTarget(notification);
//       }

//       await moveToHistory(notification);

//       console.log("✅ Instant notification sent:", notificationId);

//     } catch (err) {
//       console.error("❌ Listener error:", err);
//     }

//   });

// }
// async function processNotification(notification) {

//   if (notification.target_type === "ALL") {
//     await sendToAll(notification);
//   }

//   if (notification.target_type === "TARGET") {
//     await sendToTarget(notification);
//   }

//   await moveToHistory(notification);

// }

// async function sendToAll(notification) {

//   const users = await pool.query(
//     `SELECT push_token
//      FROM tb_emp_login_auth
//      WHERE push_token IS NOT NULL`
//   );

//   const tokens = users.rows.map(r => r.push_token);

//   await sendPush(tokens, notification.title, notification.message_template);
// }

// async function sendToTarget(notification) {

//   const users = await pool.query(
//     `SELECT push_token
//      FROM tb_emp_login_auth
//      WHERE mobile_number = $1
//      AND push_token IS NOT NULL`,
//     [notification.target_mobile]
//   );

//   if (users.rows.length === 0) return;

//   await sendPush(
//     [users.rows[0].push_token],
//     notification.title,
//     notification.message_template
//   );
// }

// async function moveToHistory(notification) {

//   await pool.query(
//     `INSERT INTO tb_notification_history
//      (
//        notification_id,
//        title,
//        message_template,
//        notification_type,
//        target_type,
//        target_mobile,
//        scheduled_at,
//        routine_time,
//        repeat_type,
//        repeat_day_of_week,
//        repeat_day_of_month,
//        notification_status
//      )
//      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'SENT')`,
//     [
//       notification.notification_id,
//       notification.title,
//       notification.message_template,
//       notification.notification_type,
//       notification.target_type,
//       notification.target_mobile,
//       notification.scheduled_at,
//       notification.routine_time,
//       notification.repeat_type,
//       notification.repeat_day_of_week,
//       notification.repeat_day_of_month
//     ]
//   );

//   await pool.query(
//     `DELETE FROM tb_notification_master
//      WHERE notification_id = $1`,
//     [notification.notification_id]
//   );
// }

// module.exports = startNotificationListener;
