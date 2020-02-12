var admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bendan-app.firebaseio.com"
});
const db = admin.firestore();

module.exports = { admin, db };
