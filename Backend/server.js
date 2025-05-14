const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");

require('dotenv').config();
const axios = require('axios');

const plantSchema = new mongoose.Schema({
  name: String,
  scientific_name: String,
  sunlight: String,
  watering: String,
  duration: String,
  username: String, 
});

const plantModel = mongoose.model("plants", plantSchema);


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

  app.use(express.static("public"));

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

  app.get("/location", (_req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/HTML/location.html"));
});

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

  app.get('/api/plants/:name', async (req, res) => {
  const plantName = req.params.name;
  const token = process.env.TREFLE_TOKEN;

  console.log(`Fetching plant info for: ${plantName}`);


  if (!token) {
    console.error("Missing TREFLE_TOKEN in environment!");
    return res.status(500).send("Trefle API key not configured on server.");
  }

  try {
    const searchUrl = `https://trefle.io/api/v1/plants/search?token=${token}&q=${plantName}`;
    const searchRes = await axios.get(searchUrl);

    if (!searchRes.data.data || searchRes.data.data.length === 0) {
      console.warn(`No plant found for query: "${plantName}"`);
      return res.status(404).send("Plant not found");
    }


    const plantSlug = searchRes.data.data[0].slug;
    const detailUrl = `https://trefle.io/api/v1/plants/${plantSlug}?token=${token}`;
    const detailRes = await axios.get(detailUrl);

    const plant = detailRes.data.data;

    const plantInfo = {
      common_name: plant.common_name,
      scientific_name: plant.scientific_name,
      family: plant.family_common_name,
      sunlight: plant.main_species?.growth?.light || null,
      watering: plant.main_species?.growth?.moisture_use || null,
      duration: plant.main_species?.duration || null
    };

    console.log("Plant info fetched:", plantInfo);

    res.json(plantInfo);
  } catch (err) {
    console.error("Error fetching from Trefle:", err.response?.data || err.message);
    res.status(500).send("Error fetching plant info from Trefle API");
  }
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
