const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");

const favoritesSchema = new mongoose.Schema({
  name: String,
  username: String,
});
const favoritesModel = mongoose.model("favorites", favoritesSchema);

const timelineSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: Date,
  username: String,
});
const timelineModel = mongoose.model("timeline", timelineSchema);

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/test");

  const app = express();
  const port = 3000;

  // Serve static files from Frontend folder
  app.use(express.static(path.join(__dirname, "../Frontend")));

  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: "keyboard cat",
      resave: true,
      saveUninitialized: true,
      cookie: { secure: false },
    })
  );

  const usersArr = [
    { username: "admin1", password: "admin1" },
    { username: "admin2", password: "admin2" },
    { username: "user1", password: "password1" },
    { username: "user2", password: "password2" },
    { username: "user3", password: "password3" },
  ];

  const isAuthenticated = (req, res, next) =>
    req.session && req.session.user
      ? next()
      : res.redirect("/HTML/login.html");

  app.get("/", (_req, res) => res.redirect("/home"));

  app.get("/HTML/login", (_req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/HTML/login.html"));
  });

  app.post("/HTML/login", (req, res) => {
    const { username, password } = req.body;
    const user = usersArr.find(
      (u) => u.username === username && u.password === password
    );
    if (!user) return res.status(401).send("Invalid credentials");
    req.session.user = user;
    addToTimeline("index", "User logged in", new Date(), user.username);
    res.sendFile(path.join(__dirname, "../Frontend/HTML/index.html")); // Or another main page
  });

  app.use(isAuthenticated);

  app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/HTML/index.html"));
  });

  app.get("/favorites", async (req, res) => {
    try {
      const favoritesFound = await favoritesModel.find({
        username: req.session.user.username,
      });
      res.json(favoritesFound);
    } catch (err) {
      console.log("db error", err);
    }
  });

  app.get("/timeline", async (req, res) => {
    try {
      const timelineFound = await timelineModel.find({
        username: req.session.user.username,
      });
      res.json(timelineFound);
    } catch (err) {
      console.log("db error", err);
    }
  });

  app.get("/addFavorite/:favorite", async (req, res) => {
    const favorite = req.params.favorite;
    const username = req.session.user.username;
    try {
      const result = await favoritesModel.create({ name: favorite, username });
      addToTimeline("Added Favorite", favorite, new Date(), username);
      res.json(result);
    } catch (err) {
      console.log("db error", err);
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

async function addToTimeline(title, description, date, username) {
  try {
    return await timelineModel.create({ title, description, date, username });
  } catch (err) {
    console.log("db error", err);
  }
}
