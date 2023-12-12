const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 8080;
const mysql = require("mysql");
const listEndpoints = require("express-list-endpoints")
const fs = require("fs");
const jwt = require("jsonwebtoken");

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(express.json())

const httpServer = app.listen(port, function () {
  console.log(`Web server is running on port ${port}`);
});

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "forum",
  multipleStatements: true,
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connected to the database!");
});


const crypto = require("crypto");
function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}



app.get("/endpoints", (req, res) => {
  res.send(listEndpoints(app))
});


app.get("/login-new-user", function (req, res) {
  res.sendFile(__dirname + "/login.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/userlogin.html");
});


// LOGIN NEW USER --> hash password
app.post("/login-new-user", function (req, res) {
  if (!(req.body && req.body.username && req.body.password && req.body.name)) {
    res.status(400).send({
      success: false,
      error: "Name, username & password is required!"
    });
    return;
  }

  let fields = ["name", "password", "username"];
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send({
        success: false,
        error: "Unknown field: " + key
      });
      return;
    }
  }

  let sql = `
    INSERT INTO users (username, name, password)
    VALUES ('${req.body.username}', '${req.body.name}', '${hash(req.body.password)}');
    SELECT LAST_INSERT_ID();`;

  console.log(sql);

  db.query(sql, function (err, result, fields) {
    if (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        error: "Server Error"
      });
      return;
    }

    res.redirect("/forum");
    // res.status(200).json({ success: true, data: output });
  });
});


// LOGIN EXISTING USER ---> hash password
app.post("/login", function (req, res) {
  if (!(req.body && req.body.username && req.body.password && req.body.name)) {
    res.status(400).json({
      success: false,
      message: "Bad Request: Missing credentials"
    });
    return;
  }

  let sql = `
  SELECT * FROM users WHERE username='${req.body.username}'`;

  db.query(sql, function (err, result, fields) {
    if (err) {
      console.error(err);
      res.status(500).json({
        success: false, error: "Server Error"
      });
      return;
    }

    if (result.length > 0) {
      let passwordHash = hash(req.body.password);
      if (result[0].password == passwordHash) {
        let payload = {
          sub: result[0].username,
          name: result[0].name,
        };

        let token = jwt.sign(payload, "EnHemlighetSomIngenKanGissaXyz123%&/");

        //  token in a cookie
        res.cookie('token', token);
        res.redirect("/forum");
      } else {
        res.status(401).json({
          success: false,
          message: "Unauthorized: wrong credentials"
        });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Unauthorized: User not found"
      });
    }
  });
});

// GET USERS
app.get("/users", function (req, res) {
  let authHeader = req.headers["authorization"];
  if (authHeader === undefined) {

    res.sendStatus(400);
    return;
  }
  let token = authHeader.slice(7);

  let decoded;
  try {
    decoded = jwt.verify(token, "EnHemlighetSomIngenKanGissaXyz123%&/");
  } catch (err) {
    console.log(err);
    res.status(401).send("Invalid auth token");
    return;
  }

  let sql = "SELECT * FROM users";
  console.log(sql);

  db.query(sql, function (err, result, fields) {
    res.send(result);
  });
});



// GET USER BY ID
app.get("/users/:id", function (req, res) {
  let authHeader = req.headers["authorization"];
  if (authHeader === undefined) {
    res.sendStatus(400);
    return;
  }
  let token = authHeader.slice(7);

  let decoded;
  try {
    decoded = jwt.verify(token, "EnHemlighetSomIngenKanGissaXyz123%&/");
  } catch (err) {
    console.log(err);
    res.status(401).send("Invalid auth token");
    return;
  }
  // Get the user ID from the request parameters
  const userId = req.params.id;

  let sql = `SELECT * FROM users WHERE user_id = ?`;
  db.query(sql, [userId], function (err, result, fields) {
    if (err) {
      console.log(err);
      res.sendStatus(500);
      return;
    }

    if (result.length === 0) {
      res.sendStatus(404);
      return;
    }
    res.send(result[0]);
  });
});


//Display all posts at forum
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
  const { heading, body, author } = req.body;

  let sql = `INSERT INTO posts (heading, body, author)
             VALUES ('${heading}', '${body}', '${author}')`;

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


// GET POST BY ID & ITS COMMENTS
app.get("/viewpost/:postId", (req, res) => {
  const { postId } = req.params

  let postSql =
    `SELECT * FROM posts WHERE post_id = ${postId}`;

  let commentsSql =
    `SELECT * FROM comments WHERE post_id = ${postId}`;

  db.query(postSql, [postId], (err, posts) => {
    if (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        error: "Server Error"
      });
      return;
    }

    if (!posts || posts.length === 0) {
      res.status(400).json({
        success: false,
        error: ` No post with id ${postId} found`
      });
      return;
    }

    db.query(commentsSql, [postId], (err, comments) => {
      if (err) {
        console.error(err);
        res.status(500).json({
          success: false,
          error: "Server Error"
        });
        return;
      }

      const post = posts[0];
      post.comments = comments;

      // res.status(200).json({
      //   success: true,
      //   data: post 
      //   // (comments --> to display only comments belonging to chosen post)
      // });
      res.sendFile(__dirname + "/viewpost.html", post);
    });
  });
});


// ADD COMMENT 
app.post("/addcomment", (req, res) => {
  try {
    const { post_id, comment, author } = req.body;

    const sql = `
    INSERT INTO comments (post_id, comment, author)
    VALUES ('${req.body.post_id}', '${req.body.comment}', '${req.body.author}')`

    db.query(sql, [post_id, comment, author], (err, result, fields) => {
      if (err) {
        res.status(500).json({ sucess: "Server Error 1" });
        return;
      }
      res.json({ success: true });

    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ sucess: "Server Error 2" });
  }
});