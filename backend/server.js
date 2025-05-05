const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema({
    name: String,
    type: String,
    username: String,
})

const plantModel = mongoose.model("plants", plantSchema);

main().catch(console.error);

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/plantpal")

    const app = express();
    const port = 3000;

    app.set("view engine", "ejs");
    app.use(express.static("public"));
    app.use(express.urlencoded({ extended: true}));

    app.use(session({
        secret: "plant-secrets",
        resave: true,
        saveUnitialized: true,
        cookie: { secure: false },
    }));

    const users = [
        { username: "plant1", password: "123456" },
        { username: "plant2", password: "123456" },
    ];

    const isAuthenticated = (req, res, next) =>
        req.session?.user ? next() : res.redirect("/login");

    app.get("/", (_req, res) => res.redirect("/home"));
    app.get("/login", (_req, res) => res.sendFile(__dirname + "/login.html"));

    app.post("/login", (req, res) => {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) return res.status(401).send("Invalid login.");
        req.session.user = user;
        res.redirect("/home");
    });

    app.use(isAuthenticated)

    app.get("/home", (req, res) => {
        res.render("home.ejs", { username: req.session.user.username });
    
    });

    app.post("/add-plant", async (req, res) => {
        const { name, type } = req.body;
        await plantModel.create({ name, type, username: req.session.user.username })
        res.redirect("/my-plants");
    });

    app.listen(port, () => {
        console.log(`PlantPal server running at http://localhost:${port}`);
    });
}
