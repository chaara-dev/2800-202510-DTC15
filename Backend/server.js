const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");

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

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  isAdmin: Boolean,
});
const userModel = mongoose.model("users", userSchema);

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO_URI);


  const app = express();
  const port = process.env.PORT || 3000;


  app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../Frontend"));


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

  app.post("/HTML/login", async (req, res) => {
    const { username, password, remember } = req.body;

    const localUser = usersArr.find(
      (u) => u.username === username && u.password === password
    );
    if (localUser) {
      req.session.user = localUser;
      req.session.cookie.maxAge = remember
        ? 7 * 24 * 60 * 60 * 1000
        : null;

      return res.redirect("/home");
    }

    const dbUser = await userModel.findOne({ username });
    if (!dbUser) return res.status(401).send("Invalid credentials");

    const match = await bcrypt.compare(password, dbUser.password);
    if (!match) return res.status(401).send("Invalid credentials");

    req.session.user = { username: dbUser.username, isAdmin: dbUser.isAdmin };
    req.session.cookie.maxAge = remember
      ? 7 * 24 * 60 * 60 * 1000
      : null;

    res.redirect("/home");
  });

  app.post("/signup", async (req, res) => {
    const { username, password } = req.body;

    const existingUser = await userModel.findOne({ username });
    if (existingUser) return res.send("Username already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new userModel({
      username,
      password: hashedPassword,
      isAdmin: false,
    });
    await newUser.save();

    req.session.user = { username, isAdmin: false };
    await addToTimeline("signup", "New user created", new Date(), username);
    res.redirect("/home");
  });

  app.use(isAuthenticated);

  app.get("/home", (req, res) => {
    const username = req.session.user?.username;
    res.render("HTML/index", { username });
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
