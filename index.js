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

// Add custom routes
app.addRoute("GET", "/seals", (req, res, next) => {});

// add event-driven functionality
app.onGetAllRows().add(async (event) => {
  console.log("Triggered Event: 'GET_ALL_ROW' For all tables");
  await new Promise((resolve, reject) => {
    setTimeout(() => console.log("All Tables Async Call"), 1000);
  });
  resolve();
});

// add event-driven functionality
app.onGetAllRows("seals").add(async (event) => {
  console.log("Triggered Event: GET_ALL_ROWS for 'seals' table");
  await new Promise((resolve, reject) => {
    setTimeout(() => console.log("Seals Table Async Call"), 1000);
  });
  resolve();
});

app.start();
