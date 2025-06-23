const { createServer } = require("node:http");
const backend = require("./backend");
const hostname = "127.0.0.1";
const fs = require("fs");
const port = 3001;

const server = createServer((req, res) => {
  switch (req.url) {
    case "/":
      fs.readFile("../website/index.html")
        .then((contents) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(contents);
        })
        .catch((err) => {
          res.statusCode = 500;
          res.end(err);
          return;
        });
    case "/data":
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      const jsonValue = backend.retrieveData();
      console.log(jsonValue);
      res.end(jsonValue);
    default:
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Resource not found" }));
  }
});
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
