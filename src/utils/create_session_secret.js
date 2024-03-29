import fs from "fs";
import crypto from "crypto";

export function createSessionSecret() {
  return crypto.randomBytes(32).toString("hex");
}

export function saveSessionSecret(secret) {
  let file = fs.readFileSync(".env");
  file = file.toString().replace("SESSION_SECRET=", "SESSION_SECRET=" + secret);
  fs.writeFileSync(".env", file);
}
