// Plesk/Passenger Node.js startup file: Passenger runs `node app.js` directly
// (not `npm start`), so this boots the already-built Next.js production
// server and listens on the port Passenger assigns via process.env.PORT.
const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Ready on port ${port}`);
  });
});
