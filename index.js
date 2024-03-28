import { pnpd } from "./src/pinniped/pinniped.js";

const app = pnpd();

// Extensibility Invocations

// add custom routes
app.addRoute("GET", "/seals", (req, res, next) => {
  res.json({ custom: "elephant seals" });
});

// add event-driven functionality
app.onGetOneRow("seals").add((event) => {
  console.log("Triggered event: onGetAllRows");
});

app.start(3000);
