const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 8080;
const mysql = require("mysql");
const listEndpoints = require("express-list-endpoints")
const fs = require("fs");


app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(bodyParser.json());


const httpServer = app.listen(port, function () {
  console.log(`Web server is running on port ${port}`);
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

// app.get("/styles.css", (req, res) => {
//   // Sending styles.css
//   res.sendFile(path.join(__dirname, "public", "style.css"));
// });


//display available endpoints, "documentations"
app.get("/endpoints", (req, res) => {
  res.send(listEndpoints(app))
});

// Skickar till klient sida med formulär för loggin
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/login.html");
});

app.get("/userlogin", (req, res) => {
  res.sendFile(__dirname + "/userlogin.html");
});

// loggin already a user
app.post("/userlogin", function (req, res) {
  db.connect(function (err) {

    let sql = `
      SELECT name, username, password, email FROM users
      WHERE name = 
      '${req.body.name}' AND username = '${req.body.username}' AND password = '${req.body.password}' AND email = '${req.body.email}' `;
    //console.log(sql);

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

    let sql = `
      INSERT INTO users (name, username, password, email)
      VALUES ('${req.body.name}', '${req.body.username}', '${req.body.password}', '${req.body.email}')`;
    //console.log(sql);

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

  let sql = `INSERT INTO posts (heading, body)
  VALUES ('${req.body.heading}', '${req.body.body}')`

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.redirect("/forum");
  });
});


//get post as json, fetch in client
app.get("/getpost/:postId", (req, res) => {
  const postId = req.params.postId;

  let postSql =
    "SELECT * FROM posts WHERE post_id = ?";

  let commentsSql =
    "SELECT * FROM comments WHERE post_id = ?";

  db.query(postSql, [postId], (err, posts) => {
    if (err) {
      console.error(err);
      res.status(500).send("Server Error, getpost");
      return;
    }

    db.query(commentsSql, [postId], (err, comments) => {
      if (err) {
        console.error(err);
        res.status(500).send("Server Error, getpost");
        return;
      }
      const post = posts[0];
      post.comments = comments;
      res.json(post);
    });
  });
});

//go to specific post and comments - client
app.get("/viewpost/:postId", (req, res) => {
  const postId = req.params.postId;
  //console.log("Post ID:", postId);

  const postSql =
    "SELECT * FROM posts WHERE post_id = ?";

  const commentsSql =
    "SELECT * FROM comments WHERE post_id = ?";

  db.query(postSql, [postId], (err, posts) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Server Error, viewpost" });
      return;
    }

    db.query(commentsSql, [postId], (err, comments) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error, wievpost" });
        return;
      }

      const data = {
        post: posts[0],
        comments: comments,
      };
      res.sendFile(__dirname + "/viewpost.html", data);
    });
  });
});

// add comment - works!
// error solved send-->json
app.post("/addcomment", (req, res) => {
  try {
    const { post_id, comment } = req.body;

    const sql = `
    INSERT INTO comments (post_id, comment)
    VALUES ('${req.body.post_id}', '${req.body.comment}')`

    db.query(sql, [post_id, comment], (err, result, fields) => {
      if (err) {
        //console.error("SQL error:", sql, err);
        res.status(500).json({ sucess:"Server Error 1"});
        return;
      }
      res.json({ success: true });
     
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({sucess:"Server Error 2"});
  }
});