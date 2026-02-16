const admin = require("firebase-admin");
const serviceAccount = require("../config/firebase-service-account");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
// const admin = require("firebase-admin");

// const serviceAccount = JSON.parse(
//   Buffer.from(
//     process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
//     "base64"
//   ).toString("utf8")
// );

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// module.exports = admin;
