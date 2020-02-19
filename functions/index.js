const functions = require("firebase-functions");
const app = require("express")();
const firebase = require("firebase");
const FBAuth = require("./util/fbAuth");
const { validateSignupData, validateLoginData } = require("./util/validators");
const { db } = require("./util/admin");

const config = {
  apiKey: "AIzaSyAcDm2JSuv6wO4YGcG3gI3Aqyi1Tp2NLrQ",
  authDomain: "bendan-app.firebaseapp.com",
  databaseURL: "https://bendan-app.firebaseio.com",
  projectId: "bendan-app",
  storageBucket: "bendan-app.appspot.com",
  messagingSenderId: "452110092392",
  appId: "1:452110092392:web:c13da2f17beecb4bc193dd",
  measurementId: "G-R0E88LGMDS"
};

firebase.initializeApp(config);

exports.api = functions.https.onRequest(app);

app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;

      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userId
      };

      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ error: "Email already in use" });
      } else {
        return res
          .status(500)
          .json({ general: "Something went wrong, please try again" });
      }
    });
});

app.get("/posts", (req, res) => {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let posts = [];
      data.forEach(doc => {
        posts.push({
          postId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt
        });
      });
      return res.json(posts);
    })
    .catch(err => console.error(err));
});

app.post("/posts", (req, res) => {
  const newPost = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString()
  };

  db.collection("posts")
    .add(newPost)
    .then(doc => {
      res.json({ message: `document ${doc.id} created successfully ` });
    })
    .catch(err => {
      res.status(500).json({ error: "Something went wrong" });
      console.err(error);
    });
});

app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });
    })
    .catch(err => {
      console.log(err);
      if ((err.code = "auth/wrong-password")) {
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

app.get("/user", FBAuth, (req, res) => {
  let userData = {};
  console.log(req.params.handle);
  console.log("Logs visible");
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return res.json(userData);
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    });
});
