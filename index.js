let mysql = require("mysql");
const express = require("express");
const app = express();
const port = 8080;

const httpServer = app.listen(port, function () {
  console.log(`Web server is running on port ${port}`);
});

app.use(express.urlencoded({ extended: true }));
const fs = require("fs");

  app.get("/", function (req, res) {
    res.sendFile(__dirname + "/login.html");
  });
  
  app.use(express.urlencoded({ extended: true })); 

  app.post("/", function (req, res) {
    con = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jensen2023",
    });
    con.connect(function (err) {
      console.log("Connected to the database!");
      let sql = `INSERT INTO users (name, username, password, email)
      VALUES ('${req.body.name}', '${req.body.username}', '${req.body.password}', '${req.body.email}')`;
      console.log(sql);
      con.query(sql, function (err, result) {
        if (err) console.log(err);

        res.redirect("/addpost");
      });
    });
  });

  app.get("/addpost", function (req, res) {
    con = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jensen2023",
    });
    con.connect(function (err) {
      if (err) throw err;
      con.query("SELECT created_at, heading FROM posts", function (err, result, fields) {
        if (err) throw err;
  
        let output = "";
        for (let post of result) {
          const createdAt = new Date(post.created_at);
          const formattedDate = createdAt.toLocaleString();
          output += `${formattedDate}, Post: ${post.heading}<br>`;
        }
        res.send(`
          <section class="forum-section">
            <form class="new-post-form" action="/addpost" method="post">
              <input type="text" name="username" placeholder="username">
              <input type="text" name="newpost" placeholder="new post">
              <button type="submit">add post</button>
            </form>
            <h3>Forum</h3>
            <div id="posts-container">
              ${output}
            </div>
          </section>
        `);
      });
    });
  });
    