import session from "express-session";
import fs from "fs";
import memoryStore from "memorystore";
const MemoryStore = memoryStore(session);

import {
  createSessionSecret,
  saveSessionSecret,
} from "../../utils/create_session_secret.js";

if (!fs.existsSync("pnpd_data")) fs.mkdirSync("pnpd_data");

if (!process.env.SESSION_SECRET) {
  const secret = createSessionSecret();
  saveSessionSecret(secret);
  process.env.SESSION_SECRET = secret;
}

export default function sessionConfig() {
  return session({
    store: new MemoryStore({
      checkPeriod: 864000,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60 * 60 * 3000, // 3 hour
      httpOnly: true,
      secure: false,
    },
  });
}
