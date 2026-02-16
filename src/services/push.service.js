// const admin = require("firebase-admin");

// // initialize once
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(
//       require("../config/firebase-service-account") // your firebase file
//     )
//   });
// }

// async function sendPush(tokens, title, body) {
//   if (!tokens || tokens.length === 0) return;

//   const message = {
//     notification: {
//       title,
//       body
//     },
//     tokens
//   };

//   try {
//     const response = await admin.messaging().sendEachForMulticast(message);
//     console.log("✅ Push sent:", response.successCount);
//   } catch (error) {
//     console.error("❌ Push error:", error);
//   }
// }

// module.exports = { sendPush };





// async function sendPush(tokens, title, body) {

//   if (!tokens || tokens.length === 0) return;

//   console.log("🚀 Sending push to:", tokens.length, "devices");
//   console.log("Title:", title);
//   console.log("Message:", body);

//   // TODO: Replace with Firebase logic

//   return true;
// }

// module.exports = { sendPush };
const admin = require("../config/firebase");

async function sendPush(tokens, title, body) {

  if (!tokens || tokens.length === 0) return;

  console.log("🚀 Sending push to:", tokens.length, "devices");

  const message = {
    tokens: tokens,
    notification: {
      title: title,
      body: body
    },
    android: {
      notification: {
        icon: "ic_notification",   // must match drawable icon name
        color: "#FF0000",
        channelId: "default_channel"
      }
    }
  };

  try {

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("✅ Success:", response.successCount);
    console.log("❌ Failed:", response.failureCount);

    return true;

  } catch (error) {
    console.error("❌ Push Error:", error);
    return false;
  }
}

module.exports = { sendPush };
