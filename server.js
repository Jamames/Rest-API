const express = require("express");
const app = express();
const port = 3000;
const crypto = require("crypto");
let jwt = require("jsonwebtoken");

app.use(express.json());


let mysql = require("mysql");
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "cool_databas",
});

function checkAuth(req, res, next) {
  let authHeader = req.headers["authorization"];
  if (authHeader === undefined) {
    res.sendStatus(401);
    return;
  }
  let token = authHeader.slice(7);
  try {
    jwt.verify(token, "superduperduperhemlig hemlighet");
    next(); // Proceed to the next middleware function
  } catch (err) {
    console.log(err);
    res.sendStatus(401);
  }
}

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.post("/login", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  if (username && password) {
    let sql = `SELECT * FROM users WHERE username='${username}'`;
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length === 1) {
        let user = result[0];
        let passwordHash = hash(password);
        if (passwordHash === user.password) {
          let payload = {
            sub: user.id, //sub är obligatorisk
            name: user.username, //Valbar
          };
          let token = jwt.sign(payload, "superduperduperhemlig hemlighet", {expiresIn:"2h"});
          res.send(token);
        } else {
          res.status(401).send("Incorrect username or password");
        }
      } else {
        res.status(401).send("Incorrect username or password");
      }
    });
  } else {
    res.status(422).send("Missing username or password");
  }
});

app.use(checkAuth);

app.get("/users", function (req, res) {
  var sql = "SELECT * FROM users";
  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    res.send(result);
  });
});

app.get("/users/:id", function (req, res) {
  const userId = req.params.id;
  var sql = `SELECT * FROM users WHERE id = ${userId}`;
  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    res.send(result);
  });
});

function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

app.put("/users/:id", function (req, res) {
  req.body.password = hash(req.body.password);
  var sql = `UPDATE users 
  SET username = '${req.body.username}', password = '${req.body.password}'
      WHERE id = ${req.params.id}`;

  con.query(sql, function (err, result, fields) {
    console.log(result);
    if (err || result.affectedRows == 0) {
      console.error(err);
      res.sendStatus(400).send("nu blev de fel nån stans");
    } else {
      res.sendStatus(200);
    }
  });
});

app.post("/users", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  if (username && password) {
    const hashedPassword = hash(password);

    var sql = `INSERT INTO users (username, password) VALUES ('${username}', '${hashedPassword}')`;
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("1 record inserted");
      console.log(result);
      let createdUser = req.body;
      createdUser.id = result.insertId;
      res.send(createdUser);
    });
  } else {
    res.sendStatus(422);
  }
});


app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
