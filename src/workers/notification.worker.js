// const cron = require("node-cron");
// const pool = require("../config/db");
// const { sendPush } = require("../services/push.service");

// /* =====================================================
//    RUNS EVERY MINUTE
// ===================================================== */
// cron.schedule("* * * * *", async () => {

//   try {

//     console.log("⏳ Checking scheduled notifications...");

//     /* ===============================
//        1️⃣ SCHEDULED NOTIFICATIONS
//     =============================== */

//     const { rows: scheduledRows } = await pool.query(
//       `SELECT * FROM tb_notification_master
//        WHERE notification_type = 'SCHEDULED'
//        AND notification_status = 'PENDING'
//        AND scheduled_at <= NOW()`
//     );

//     for (const notification of scheduledRows) {

//       await sendToAll(notification);

//       await moveToHistory(notification);

//       console.log("✅ Scheduled sent:", notification.notification_id);
//     }

//     /* ===============================
//        2️⃣ ROUTINE NOTIFICATIONS
//     =============================== */

//     const { rows: routineRows } = await pool.query(
//       `SELECT * FROM tb_notification_master
//        WHERE notification_type = 'ROUTINE'
//        AND routine_time = CURRENT_TIME::time`
//     );

//     for (const notification of routineRows) {

//       await sendToAll(notification);

//       await logRoutineExecution(notification.notification_id);

//       console.log("🔁 Routine executed:", notification.notification_id);
//     }

//   } catch (err) {
//     console.error("❌ Worker error:", err);
//   }

// });


// /* =====================================================
//    SEND TO ALL USERS
// ===================================================== */

// async function sendToAll(notification) {

//   const users = await pool.query(
//     `SELECT push_token
//      FROM tb_emp_login_auth
//      WHERE push_token IS NOT NULL`
//   );

//   const tokens = users.rows.map(r => r.push_token);

//   if (tokens.length === 0) return;

//   await sendPush(tokens, notification.title, notification.message_template);
// }


// /* =====================================================
//    MOVE TO HISTORY + DELETE (FOR SCHEDULED)
// ===================================================== */

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


// /* =====================================================
//    ROUTINE EXECUTION LOG
// ===================================================== */

// async function logRoutineExecution(notificationId) {

//   await pool.query(
//     `INSERT INTO tb_routine_execution_log
//      (notification_id)
//      VALUES ($1)`,
//     [notificationId]
//   );
// }

const cron = require("node-cron");
const pool = require("../config/db");
const { sendPush } = require("../services/push.service");

cron.schedule("* * * * *", async () => {

  try {

    console.log("⏳ Worker running...");

    /* ================= SCHEDULED ================= */

    const { rows: scheduledRows } = await pool.query(
      `SELECT * FROM tb_notification_master
       WHERE notification_type = 'SCHEDULED'
       AND notification_status = 'PENDING'
       AND scheduled_at <= NOW()`
    );

    for (const notification of scheduledRows) {

      await sendToAll(notification);
      await moveToHistory(notification);

      console.log("⏰ Scheduled sent:", notification.notification_id);
    }

    /* ================= ROUTINE ================= */

    const { rows: routineRows } = await pool.query(
      `SELECT *
       FROM tb_notification_master
       WHERE notification_type = 'ROUTINE'
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

      await pool.query(
        `INSERT INTO tb_routine_execution_log (notification_id)
         VALUES ($1)`,
        [notification.notification_id]
      );

      console.log("🔁 Routine executed:", notification.notification_id);
    }

  } catch (err) {
    console.error("❌ Worker error:", err);
  }

});

async function sendToAll(notification) {

  const users = await pool.query(
    `SELECT push_token
     FROM tb_emp_login_auth
     WHERE push_token IS NOT NULL`
  );

  const tokens = users.rows.map(r => r.push_token);

  await sendPush(tokens, notification.title, notification.message_template);
}

async function moveToHistory(notification) {

  await pool.query(
    `INSERT INTO tb_notification_history
     SELECT *, CURRENT_TIMESTAMP
     FROM tb_notification_master
     WHERE notification_id = $1`,
    [notification.notification_id]
  );

  await pool.query(
    `DELETE FROM tb_notification_master
     WHERE notification_id = $1`,
    [notification.notification_id]
  );
}

