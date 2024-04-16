import { pnpd } from "./src/pinniped/pinniped.js";
import "dotenv/config";

// see .env.template for comments on config properties
let serverConfig = {
  domain: process.env.SERVER_DOMAIN,
  altNames: process.env.SERVER_ALTNAMES,
  directory: process.env.SERVER_DIRECTORY,
  port: process.env.SERVER_PORT,
};

const app = pnpd(serverConfig);

// Extensibility Invocations

// add custom routes
app.addRoute("GET", "/seals", (req, res, next) => {
  res.json({ custom: "elephant seals" });
});

// add event-driven functionality
app.onGetOneRow.addListener(
  (event) => {
    console.log("Triggered event: onGetAllRows");
  },
  ["seals"]
);

app.start();
