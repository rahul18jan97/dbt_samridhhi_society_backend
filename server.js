require("dotenv").config();

const app = require("./src/app");

// ONLY WORKER
require("./src/workers/notification.worker");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// require("dotenv").config();

// const app = require("./src/app");

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// const notificationRoutes = require("./src/routes/notification.routes");

// app.use("/api", notificationRoutes);

// const startNotificationListener =
// require("./src/listeners/notification.listener");

// require("./src/workers/notification.worker");

// startNotificationListener();

// const startNotificationListener = require("./src/listeners/notification.listener");
// require("./src/workers/notification.worker");

// async function startServer() {

//   await startNotificationListener();

//   console.log("🚀 Notification system started...");
// }

// startServer();

