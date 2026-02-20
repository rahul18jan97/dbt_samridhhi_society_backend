const cron = require("node-cron");
const pool = require("../config/db");
const { sendPush } = require("../services/push.service");

console.log("🔔 Notification worker started...");

cron.schedule("* * * * *", async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("⏳ Checking notifications...");

    const { rows } = await client.query(`
      SELECT *
      FROM tb_notification_master
      WHERE is_active = true
      AND notification_status = 'PENDING'
      AND (
            -- NORMAL (instant)
            notification_type = 'NORMAL'

            OR

            -- ONE TIME SCHEDULED
            (notification_type = 'SCHEDULED'
             AND scheduled_at <= NOW())

            OR

            -- ROUTINE
            (
              notification_type = 'ROUTINE'
              AND (
                    repeat_type = 'DAILY'
                    OR
                    (repeat_type = 'WEEKLY'
                     AND repeat_day_of_week = EXTRACT(DOW FROM CURRENT_DATE))
                    OR
                    (repeat_type = 'MONTHLY'
                     AND repeat_day_of_month = EXTRACT(DAY FROM CURRENT_DATE))
                  )
              AND (
                    last_sent_at IS NULL
                    OR last_sent_at::date < CURRENT_DATE
                  )
              AND routine_time <= CURRENT_TIME
            )
          )
      FOR UPDATE SKIP LOCKED
      LIMIT 20
    `);

    for (const notification of rows) {
      await processNotification(notification, client);
    }

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Worker error:", err);
  } finally {
    client.release();
  }
});


/* ================= PROCESS ================= */

async function processNotification(notification, client) {

  let tokens = [];

  if (notification.target_type === "ALL") {

    const res = await client.query(`
      SELECT push_token
      FROM tb_emp_login_auth
      WHERE push_token IS NOT NULL
    `);

    tokens = res.rows.map(r => r.push_token);
  }

  if (notification.target_type === "TARGET") {

    const res = await client.query(`
      SELECT push_token
      FROM tb_emp_login_auth
      WHERE mobile_number = $1
      AND push_token IS NOT NULL
    `, [notification.target_mobile]);

    tokens = res.rows.map(r => r.push_token);
  }

  if (tokens.length > 0) {
    await sendPush(tokens, notification.title, notification.message_template);
  }

  await finalizeNotification(notification, client);
}


/* ================= FINALIZE ================= */

async function finalizeNotification(notification, client) {

  // ROUTINE → keep record, just update last_sent_at
  if (notification.notification_type === "ROUTINE") {

    await client.query(`
      UPDATE tb_notification_master
      SET last_sent_at = NOW()
      WHERE notification_id = $1
    `, [notification.notification_id]);

    console.log("🔁 Routine sent:", notification.notification_id);
    return;
  }

  // NORMAL & SCHEDULED → move to history

  await client.query(`
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
      notification_status,
      created_at
    )
    SELECT
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
      'SENT',
      created_at
    FROM tb_notification_master
    WHERE notification_id = $1
  `, [notification.notification_id]);

  await client.query(`
    DELETE FROM tb_notification_master
    WHERE notification_id = $1
  `, [notification.notification_id]);

  console.log("📤 Sent:", notification.notification_id);
}

// const cron = require("node-cron");
// const pool = require("../config/db");
// const { sendPush } = require("../services/push.service");

// cron.schedule("* * * * *", async () => {
//   try {
//     console.log("⏳ Worker running...");

//     /* ================= ONE-TIME (SCHEDULED ONLY) ================= */

//     const { rows: scheduledRows } = await pool.query(`
//       SELECT *
//       FROM tb_notification_master
//       WHERE notification_status = 'PENDING'
//       AND notification_type = 'SCHEDULED'
//       AND scheduled_at <= NOW()
//       AND scheduled_at > (NOW() - INTERVAL '1 minute')
//     `);

//     for (const notification of scheduledRows) {
//       await processNotification(notification);
//       console.log("⏰ Scheduled sent:", notification.notification_id);
//     }

//     /* ================= ROUTINE ================= */

//     const { rows: routineRows } = await pool.query(`
//       SELECT *
//       FROM tb_notification_master
//       WHERE notification_type = 'ROUTINE'
//       AND notification_status = 'PENDING'
//       AND routine_time <= CURRENT_TIME
//       AND routine_time > (CURRENT_TIME - INTERVAL '1 minute')
//       AND (
//             repeat_type = 'DAILY'
//             OR
//             (repeat_type = 'WEEKLY'
//              AND repeat_day_of_week = EXTRACT(DOW FROM CURRENT_DATE))
//             OR
//             (repeat_type = 'MONTHLY'
//              AND repeat_day_of_month = EXTRACT(DAY FROM CURRENT_DATE))
//           )
//     `);

//     for (const notification of routineRows) {
//       await processNotification(notification);
//       console.log("🔁 Routine executed:", notification.notification_id);
//     }

//   } catch (err) {
//     console.error("❌ Worker error:", err.message);
//   }
// });


// /* ================= PROCESS ================= */

// async function processNotification(notification) {

//   if (notification.target_type === "ALL") {

//     const { rows } = await pool.query(`
//       SELECT push_token
//       FROM tb_emp_login_auth
//       WHERE push_token IS NOT NULL
//     `);

//     const tokens = rows.map(r => r.push_token);

//     if (tokens.length > 0) {
//       await sendPush(tokens, notification.title, notification.message_template);
//     }

//   } else if (notification.target_type === "TARGET") {

//     const { rows } = await pool.query(`
//       SELECT push_token
//       FROM tb_emp_login_auth
//       WHERE mobile_number = $1
//       AND push_token IS NOT NULL
//     `, [notification.target_mobile]);

//     const tokens = rows.map(r => r.push_token);

//     if (tokens.length > 0) {
//       await sendPush(tokens, notification.title, notification.message_template);
//     }
//   }

//   await moveToHistory(notification);
// }


// /* ================= MOVE TO HISTORY ================= */

// async function moveToHistory(notification) {

//   // Update status first (safe for production)
//   await pool.query(`
//     UPDATE tb_notification_master
//     SET notification_status = 'SENT'
//     WHERE notification_id = $1
//   `, [notification.notification_id]);

//   await pool.query(`
//     INSERT INTO tb_notification_history
//     (
//       notification_id,
//       title,
//       message_template,
//       notification_type,
//       target_type,
//       target_mobile,
//       scheduled_at,
//       routine_time,
//       repeat_type,
//       repeat_day_of_week,
//       repeat_day_of_month,
//       notification_status
//     )
//     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'SENT')
//   `, [
//     notification.notification_id,
//     notification.title,
//     notification.message_template,
//     notification.notification_type,
//     notification.target_type,
//     notification.target_mobile,
//     notification.scheduled_at,
//     notification.routine_time,
//     notification.repeat_type,
//     notification.repeat_day_of_week,
//     notification.repeat_day_of_month
//   ]);

//   await pool.query(`
//     DELETE FROM tb_notification_master
//     WHERE notification_id = $1
//   `, [notification.notification_id]);
// }


///last is above
// const cron = require("node-cron");
// const pool = require("../config/db");
// const { sendPush } = require("../services/push.service");

// // cron.schedule("* * * * *", async () => {

// //   try {

// //     console.log("⏳ Worker running...");

// //     /* ================= SCHEDULED ================= */

// //     const { rows: scheduledRows } = await pool.query(
// //       `SELECT *
// //        FROM tb_notification_master
// //        WHERE notification_type = 'SCHEDULED'
// //        AND notification_status = 'PENDING'
// //        AND scheduled_at <= NOW()`
// //     );

// //     for (const notification of scheduledRows) {

// //       await sendToAll(notification);

// //       await moveToHistory(notification);

// //       console.log("⏰ Scheduled sent:", notification.notification_id);
// //     }

// //     /* ================= TARGETED NORMAL ================= */

// //     const { rows: targetedRows } = await pool.query(
// //       `SELECT *
// //        FROM tb_notification_master
// //        WHERE notification_type = 'NORMAL'
// //        AND target_type = 'TARGET'
// //        AND notification_status = 'PENDING'`
// //     );

// //     for (const notification of targetedRows) {

// //       const { rows: users } = await pool.query(
// //         `SELECT push_token
// //          FROM tb_emp_login_auth
// //          WHERE mobile_number = $1
// //          AND push_token IS NOT NULL`,
// //         [notification.target_mobile]
// //       );

// //       const tokens = users.map(r => r.push_token);

// //       if (tokens.length > 0) {
// //         await sendPush(tokens, notification.title, notification.message_template);
// //       }

// //       // Update status to SENT
// //       await pool.query(
// //         `UPDATE tb_notification_master
// //          SET notification_status = 'SENT'
// //          WHERE notification_id = $1`,
// //         [notification.notification_id]
// //       );

// //       // Move to history (this also deletes from master)
// //       await moveToHistory(notification);

// //       console.log("🎯 Targeted sent:", notification.notification_id);
// //     }

// //     /* ================= ROUTINE ================= */

// //     const { rows: routineRows } = await pool.query(
// //       `SELECT *
// //        FROM tb_notification_master
// //        WHERE notification_type = 'ROUTINE'
// //        AND notification_status = 'PENDING'
// //        AND routine_time <= CURRENT_TIME
// //        AND routine_time > (CURRENT_TIME - INTERVAL '1 minute')
// //        AND (
// //             repeat_type = 'DAILY'
// //             OR
// //             (repeat_type = 'WEEKLY'
// //              AND repeat_day_of_week = EXTRACT(DOW FROM CURRENT_DATE))
// //             OR
// //             (repeat_type = 'MONTHLY'
// //              AND repeat_day_of_month = EXTRACT(DAY FROM CURRENT_DATE))
// //            )`
// //     );

// //     for (const notification of routineRows) {

// //       await sendToAll(notification);

// //       console.log("🔁 Routine executed:", notification.notification_id);
// //     }

// //   } catch (err) {
// //     console.error("❌ Worker error:", err.message);
// //   }

// // });

// cron.schedule("* * * * *", async () => {

//   try {

//     console.log("⏳ Worker running...");

//     /* ================= ONE-TIME (NORMAL + SCHEDULED) ================= */

//     const { rows: oneTimeRows } = await pool.query(`
//   SELECT *
//   FROM tb_notification_master
//   WHERE notification_status = 'PENDING'
//   AND (
//         (notification_type = 'NORMAL')
//         OR
//         (notification_type = 'SCHEDULED'
//          AND scheduled_at <= NOW()
//          AND scheduled_at > (NOW() - INTERVAL '1 minute'))
//       )
// `);


//     for (const notification of oneTimeRows) {

//       await processNotification(notification);

//       console.log("✅ One-time sent:", notification.notification_id);
//     }

//     /* ================= ROUTINE ================= */

//     const { rows: routineRows } = await pool.query(`
//       SELECT *
//       FROM tb_notification_master
//       WHERE notification_type = 'ROUTINE'
//       AND notification_status = 'PENDING'
//       AND routine_time <= CURRENT_TIME
//       AND routine_time > (CURRENT_TIME - INTERVAL '1 minute')
//       AND (
//             repeat_type = 'DAILY'
//             OR
//             (repeat_type = 'WEEKLY'
//              AND repeat_day_of_week = EXTRACT(DOW FROM CURRENT_DATE))
//             OR
//             (repeat_type = 'MONTHLY'
//              AND repeat_day_of_month = EXTRACT(DAY FROM CURRENT_DATE))
//           )
//     `);

//     for (const notification of routineRows) {

//       await processNotification(notification);

//       console.log("🔁 Routine executed:", notification.notification_id);
//     }

//   } catch (err) {
//     console.error("❌ Worker error:", err.message);
//   }

// });


// async function processNotification(notification) {

//   if (notification.target_type === "ALL") {

//     const users = await pool.query(`
//       SELECT push_token
//       FROM tb_emp_login_auth
//       WHERE push_token IS NOT NULL
//     `);

//     const tokens = users.rows.map(r => r.push_token);

//     if (tokens.length > 0) {
//       await sendPush(tokens, notification.title, notification.message_template);
//     }

//   } else if (notification.target_type === "TARGET") {

//     const { rows } = await pool.query(`
//       SELECT push_token
//       FROM tb_emp_login_auth
//       WHERE mobile_number = $1
//       AND push_token IS NOT NULL
//     `, [notification.target_mobile]);

//     const tokens = rows.map(r => r.push_token);

//     if (tokens.length > 0) {
//       await sendPush(tokens, notification.title, notification.message_template);
//     }
//   }

//   await moveToHistory(notification);
// }

// /* ================= SEND PUSH ================= */

// async function sendToAll(notification) {

//   const users = await pool.query(
//     `SELECT push_token
//      FROM tb_emp_login_auth
//      WHERE push_token IS NOT NULL`
//   );

//   const tokens = users.rows.map(r => r.push_token);

//   if (!tokens || tokens.length === 0) {
//     console.log("⚠ No push tokens found");
//     return;
//   }

//   await sendPush(tokens, notification.title, notification.message_template);
// }


// /* ================= MOVE TO HISTORY ================= */
// async function moveToHistory(notification) {

//   try {

//     await pool.query(`
//       INSERT INTO tb_history_master
//       (mobile_number, title, message, category, icon)
//       VALUES ($1, $2, $3, $4, $5)
//     `, [
//       notification.target_mobile || 'ALL',
//       notification.title,
//       notification.message_template,
//       notification.notification_type,
//       notification.notification_image
//     ]);

//     await pool.query(`
//       DELETE FROM tb_notification_master
//       WHERE notification_id = $1
//     `, [notification.notification_id]);

//   } catch (err) {
//     console.error("❌ History insert error:", err.message);
//   }
// }

// async function moveToHistory(notification) {

//   try {

//     await pool.query(
//       `INSERT INTO tb_history_master
//        (mobile_number, title, message, category, icon)
//        VALUES ($1, $2, $3, $4, $5)`,
//       [
//         notification.target_mobile || 'ALL',
//         notification.title,
//         notification.message_template,
//         notification.notification_type,
//         notification.notification_image
//       ]
//     );

//     await pool.query(
//       `DELETE FROM tb_notification_master
//        WHERE notification_id = $1`,
//       [notification.notification_id]
//     );

//   } catch (err) {
//     console.error("❌ History insert error:", err.message);
//   }
// }


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

