const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const path = require("path");
const bcrypt = require("bcrypt");

require('dotenv').config();
const axios = require('axios');

const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const plantSchema = new mongoose.Schema({
  name: String,
  scientific_name: String,
  sunlight: String,
  watering: String,
  duration: String,
  image: String,  
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

const reminderSchema = new mongoose.Schema({
  username: String,
  plantName: String,
  action: String,
  timeOfDay: String,
});
const reminderModel = mongoose.model("reminders", reminderSchema);


// Main Logic
main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const app = express();
  const port = process.env.PORT || 3000;

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "../Frontend"));
  app.use(express.static(path.join(__dirname, "../Frontend")));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      secure: false
    }
  }));

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
    const apiKey = process.env.PERENUAL_API_KEY;

    try {
      const response = await axios.get("https://perenual.com/api/species-list", {
        params: {
          key: apiKey,
          q: plantName
        }
      });

      const plant = response.data.data?.[0];

      if (!plant) {
        return res.status(404).send("Plant not found");
      }

    const plantInfo = {
      common_name: plant.common_name || plantName,
      scientific_name: plant.scientific_name || '',
      sunlight: Array.isArray(plant.sunlight) ? plant.sunlight.join(', ') : (plant.sunlight || 'Unknown'),
      watering: plant.watering || 'Unknown',
      duration: plant.cycle || 'Unknown',
      image: plant.default_image?.medium_url || ''  
    };


      res.json(plantInfo);

    } catch (err) {
      console.error("Error fetching from Perenual:", err.response?.data || err.message);
      res.status(500).send("Failed to fetch plant info from Perenual");
    }
  });

  app.use(isAuthenticated);

  app.get("/home", (req, res) => {
    const username = req.session.user?.username;
    res.render("HTML/index", { username });
  });

  app.get("/about", (_req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/HTML/about.html"));
  });

  app.get("/reminders-page", (_req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/HTML/reminders.html"));
  });

  app.get("/location", (_req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/HTML/location.html"));
  });

  app.get("/calendar", (_req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/HTML/calendar.html"));
  });

  app.get("/settings", (_req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/HTML/settings.html"));
  });


  app.get("/contact", (_req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/HTML/contact.html"));
  });
    
  app.get("/myplants", isAuthenticated, async (req, res) => {
    const username = req.session.user.username;
    const userPlants = await plantModel.find({ username });

    res.render("HTML/my_plants", { username, userPlants });
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

    app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).send("Logout failed.");
      }
      res.redirect("/HTML/login.html"); 
    });
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

  app.get("/addplant", isAuthenticated, (req, res) => {
    res.render("HTML/add_plant", {
      username: req.session.user.username,
      duplicate: false,
    });
  });



  app.post("/addplant", isAuthenticated, async (req, res) => {
    console.log("Received form data:", req.body);
    const { plant_name, scientific_name, sunlight, watering, duration, image } = req.body;
    const username = req.session.user.username;

    try {
      const existingPlant = await plantModel.findOne({ name: plant_name, username });

      if (existingPlant) {
        return res.render("HTML/add_plant", { username, duplicate: true });

      }

    await plantModel.create({
      name: plant_name,
      scientific_name,
      sunlight,
      watering,
      duration,
      image,  
      username
    });


      await addToTimeline("Plant Added", `${plant_name} was added.`, new Date(), username);
      res.redirect("/myplants");
    } catch (err) {
      console.error("Failed to add plant:", err);
      res.status(500).send("Something went wrong while adding your plant.");
    }
  });


  // AI Chatbot
  app.post("/ask-ai", async (req, res) => {
    const userQuestion = req.body.question;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "You are PlantPal AI — a friendly assistant that gives helpful and friendly plant care tips.",
          },
          { role: "user", content: userQuestion },
        ],
      });

      const answer = completion.choices[0].message.content;
      res.json({ answer });

    } catch (err) {
      console.error("GROQ AI Error:", err);
      res.status(500).json({ answer: "Sorry, PlantPal AI is unavailable right now." });
    }
  });


  app.get("/reminders", async (req, res) => {
    try {
      const reminders = await reminderModel.find({ username: req.session.user.username });
      res.json(reminders);
    } catch (err) {
      console.log("db error", err);
    }
  });

  app.post("/reminders", async (req, res) => {
    const { plantName, action, timeOfDay } = req.body;

    const reminder = new reminderModel({
      username: req.session.user.username,
      plantName,
      action,
      timeOfDay
    });

    await reminder.save();
    res.status(200).json(reminder);
  });

  

  app.post("/deleteplant/:id", isAuthenticated, async (req, res) => {
    const plantId = req.params.id;
    const username = req.session.user.username;

  try {
    await plantModel.findOneAndDelete({ _id: plantId, username });
    res.redirect("/myplants");
    } catch (err) {
    console.error("Failed to delete plant:", err);
    res.status(500).send("Error deleting plant.");
    }
  });

  app.delete("/reminders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const username = req.session.user.username;

      const deleted = await reminderModel.findOneAndDelete({ _id: id, username });

      if (!deleted) return res.status(404).json({ message: "Reminder not found" });

      res.json({ message: "Reminder deleted" });
    } catch (err) {
      console.error("Delete failed:", err);
      res.status(500).json({ message: "Server error" });
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
