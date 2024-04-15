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
app.onGetAllRows.addListener(
  async (responseData) => {
    const { req, res, data } = responseData;

    console.log("Triggered Event: 'GET_ALL_ROW' For all tables. Number 1");
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("All Tables Async Call Number 1");
        resolve();
      }, 1000);
    });

    data.rows.push({ enrichedStuff: "WOW LOOK AT ME" });
  },
  ["users"]
);

// add event-driven functionality
app.onGetAllRows.addListener(async (event) => {
  console.log("Triggered Event: GET_ALL_ROWS. Number 2");
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("All Tables Async Call Number 2");
      resolve();
    }, 1500);
  });
});

app.start();
