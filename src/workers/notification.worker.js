const cron = require("node-cron");
const pool = require("../config/db");
const { sendPush } = require("../services/push.service");

cron.schedule("* * * * *", async () => {

  try {

    console.log("⏳ Worker running...");

    /* ================= SCHEDULED ================= */

    const { rows: scheduledRows } = await pool.query(
      `SELECT *
       FROM tb_notification_master
       WHERE notification_type = 'SCHEDULED'
       AND notification_status = 'PENDING'
       AND scheduled_at <= NOW()`
    );

    for (const notification of scheduledRows) {

      await sendToAll(notification);

      await moveToHistory(notification);

      console.log("⏰ Scheduled sent:", notification.notification_id);
    }

    /* ================= TARGETED NORMAL ================= */

    const { rows: targetedRows } = await pool.query(
      `SELECT *
       FROM tb_notification_master
       WHERE notification_type = 'NORMAL'
       AND target_type = 'TARGET'
       AND notification_status = 'PENDING'`
    );

    for (const notification of targetedRows) {

      const { rows: users } = await pool.query(
        `SELECT push_token
         FROM tb_emp_login_auth
         WHERE mobile_number = $1
         AND push_token IS NOT NULL`,
        [notification.target_mobile]
      );

      const tokens = users.map(r => r.push_token);

      if (tokens.length > 0) {
        await sendPush(tokens, notification.title, notification.message_template);
      }

      // Update status to SENT
      await pool.query(
        `UPDATE tb_notification_master
         SET notification_status = 'SENT'
         WHERE notification_id = $1`,
        [notification.notification_id]
      );

      // Move to history (this also deletes from master)
      await moveToHistory(notification);

      console.log("🎯 Targeted sent:", notification.notification_id);
    }

    /* ================= ROUTINE ================= */

    const { rows: routineRows } = await pool.query(
      `SELECT *
       FROM tb_notification_master
       WHERE notification_type = 'ROUTINE'
       AND notification_status = 'PENDING'
       AND routine_time <= CURRENT_TIME
       AND routine_time > (CURRENT_TIME - INTERVAL '1 minute')
       AND (
            repeat_type = 'DAILY'
            OR
            (repeat_type = 'WEEKLY'
             AND repeat_day_of_week = EXTRACT(DOW FROM CURRENT_DATE))
            OR
            (repeat_type = 'MONTHLY'
             AND repeat_day_of_month = EXTRACT(DAY FROM CURRENT_DATE))
           )`
    );

    for (const notification of routineRows) {

      await sendToAll(notification);

      console.log("🔁 Routine executed:", notification.notification_id);
    }

  } catch (err) {
    console.error("❌ Worker error:", err.message);
  }

});


/* ================= SEND PUSH ================= */

async function sendToAll(notification) {

  const users = await pool.query(
    `SELECT push_token
     FROM tb_emp_login_auth
     WHERE push_token IS NOT NULL`
  );

  const tokens = users.rows.map(r => r.push_token);

  if (!tokens || tokens.length === 0) {
    console.log("⚠ No push tokens found");
    return;
  }

  await sendPush(tokens, notification.title, notification.message_template);
}


/* ================= MOVE TO HISTORY ================= */

async function moveToHistory(notification) {

  try {

    await pool.query(
      `INSERT INTO tb_history_master
       (mobile_number, title, message, category, icon)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        notification.target_mobile || 'ALL',
        notification.title,
        notification.message_template,
        notification.notification_type,
        notification.notification_image
      ]
    );

    await pool.query(
      `DELETE FROM tb_notification_master
       WHERE notification_id = $1`,
      [notification.notification_id]
    );

  } catch (err) {
    console.error("❌ History insert error:", err.message);
  }
}


// const cron = require("node-cron");
// const pool = require("../config/db");
// const { sendPush } = require("../services/push.service");

// cron.schedule("* * * * *", async () => {

//   try {

//     console.log("⏳ Worker running...");

//     /* ================= SCHEDULED ================= */

//     const { rows: scheduledRows } = await pool.query(
//       `SELECT * FROM tb_notification_master
//        WHERE notification_type = 'SCHEDULED'
//        AND notification_status = 'PENDING'
//        AND scheduled_at <= NOW()`
//     );

//     for (const notification of scheduledRows) {

//       await sendToAll(notification);
//       await moveToHistory(notification);

//       console.log("⏰ Scheduled sent:", notification.notification_id);
//     }

//     /* ================= ROUTINE ================= */

//     const { rows: routineRows } = await pool.query(
//       `SELECT *
//        FROM tb_notification_master
//        WHERE notification_type = 'ROUTINE'
//        AND routine_time <= CURRENT_TIME
//        AND routine_time > (CURRENT_TIME - INTERVAL '1 minute')
//        AND (
//             repeat_type = 'DAILY'
//             OR
//             (repeat_type = 'WEEKLY'
//              AND repeat_day_of_week = EXTRACT(DOW FROM CURRENT_DATE))
//             OR
//             (repeat_type = 'MONTHLY'
//              AND repeat_day_of_month = EXTRACT(DAY FROM CURRENT_DATE))
//            )`
//     );

//     for (const notification of routineRows) {

//       await sendToAll(notification);

//       await pool.query(
//         `INSERT INTO tb_routine_execution_log (notification_id)
//          VALUES ($1)`,
//         [notification.notification_id]
//       );

//       console.log("🔁 Routine executed:", notification.notification_id);
//     }

//   } catch (err) {
//     console.error("❌ Worker error:", err);
//   }

// });

// async function sendToAll(notification) {

//   const users = await pool.query(
//     `SELECT push_token
//      FROM tb_emp_login_auth
//      WHERE push_token IS NOT NULL`
//   );

//   const tokens = users.rows.map(r => r.push_token);

//   await sendPush(tokens, notification.title, notification.message_template);
// }

// async function moveToHistory(notification) {

//   await pool.query(
//     `INSERT INTO tb_notification_history
//      SELECT *, CURRENT_TIMESTAMP
//      FROM tb_notification_master
//      WHERE notification_id = $1`,
//     [notification.notification_id]
//   );

//   await pool.query(
//     `DELETE FROM tb_notification_master
//      WHERE notification_id = $1`,
//     [notification.notification_id]
//   );
// }

