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

app.onGetOneRow.addListener(
  async (event) => {
    // `event` argument contains the Express request and response
    // along with the relevant row data from the database
    const { req, res, row } = event;

    const latestSealSightings = await sealSightingsApi(row.id);

    // Conditionally return responses based on application specific logic
    if (latestSealSightings.length === 0) {
      res.status(404).json({ message: "No sightings found for this seal." });
      return;
    } else {
      row.latestSightings = latestSealSightings;
      res.status(200).json(row);
    }
  },
  ["seals"]
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
