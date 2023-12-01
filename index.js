const express = require("express");
const app = express();
const port = 8080;
const mysql = require("mysql");
const fs = require("fs");

app.use(express.urlencoded({ extended: true }));

const httpServer = app.listen(port, function () {
  console.log(`Web server is running on port ${port}`);
});


// Skickar till klient sida med formulär för loggin
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/login.html");
});

app.get("/userlogin", (req, res) => {
  res.sendFile(__dirname + "/userlogin.html");
});


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "jensen2023",
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connected to the database!");
});

// loggin already a user
app.post("/userlogin", function (req, res) {
  db.connect(function (err) {
    let sql = `
      SELECT name, username, password, email FROM users
      WHERE name = '${req.body.name}' AND username = '${req.body.username}' AND password = '${req.body.password}' AND email = '${req.body.email}'
    `;
    console.log(sql);

    db.query(sql, function (err, result) {
      if (err) {
        console.error(err);
        res.status(500).send("Server Error at loggin");
        return;
      }

      if (result.length > 0) {
        res.redirect("/forum");
      } else {
        res.status(401).send("Invalid credentials");
      }
    });
  });
});


//loggin new user
app.post("/", function (req, res) {
  db.connect(function (err) {
    let sql = `INSERT INTO users (name, username, password, email)
      VALUES ('${req.body.name}', '${req.body.username}', '${req.body.password}', '${req.body.email}')`;
    console.log(sql);
    
  db.query(sql, function (err, result) {
    if (err) {
      console.error(err);
      res.status(500).send("Server Error at loggin");
      return;
    }
    res.redirect("/forum");
  });
  });
});


 // Display all posts at forum
app.get("/forum", (req, res) => {
  const sql = "SELECT * FROM posts";
  db.query(sql, (err, posts) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.sendFile(__dirname + "/forum.html", { posts });
  });
});


// Get all posts as json to fetch 
app.get("/getposts", (req, res) => {
  const sql = "SELECT * FROM posts";
  db.query(sql, (err, posts) => {
    if (err) {
      console.error(err);
      res.status(500).send("Server Error get all posts");
      return;
    }
    res.json(posts);
  });
});

// Add new post
app.post("/addpost", (req, res) => {
  const { heading, body } = req.body;

  const sql = "INSERT INTO posts (heading, body) VALUES (?, ?)";
  db.query(sql, [heading, body], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.redirect("/forum");
  });
});