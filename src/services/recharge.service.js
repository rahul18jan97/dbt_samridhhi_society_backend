// const pool = require("../config/db");

// exports.createRecharge = async ({ user_id, mobile, operator_code, amount }) => {

//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     const { rows } = await client.query(
//       `SELECT sp_mb_recharge_create($1,$2,$3,$4) AS result`,
//       [user_id, mobile, operator_code, amount]
//     );

//     const response = rows[0].result;

//     if (!response.success) {
//       await client.query("ROLLBACK");
//       return response;
//     }

//     await client.query("COMMIT");

//     // Simulate aggregator response after 3 sec
//     setTimeout(async () => {
//       const random = Math.random();
//       const status = random > 0.2 ? "SUCCESS" : "FAILED";

//       await pool.query(
//         `SELECT sp_mb_recharge_update_status($1,$2,$3)`,
//         [response.reference_id, status, null]
//       );

//     }, 3000);

//     return response;

//   } catch (err) {
//     await client.query("ROLLBACK");
//     throw err;
//   } finally {
//     client.release();
//   }
// };

// exports.updateRecharge = async ({ reference_id, status, reason }) => {

//   const { rows } = await pool.query(
//     `SELECT sp_mb_recharge_update_status($1,$2,$3) AS result`,
//     [reference_id, status, reason]
//   );

//   return rows[0].result;
// // }