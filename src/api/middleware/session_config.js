import session from "express-session";
import store from "better-sqlite3-session-store";
import sqlite from "better-sqlite3";
import fs from "fs";

const SqliteStore = store(session);
if (!fs.existsSync("pnpd_data")) fs.mkdirSync("pnpd_data");
const db = new sqlite("pnpd_data/session.db");

export default function sessionConfig() {
  return session({
    store: new SqliteStore({
      client: db,
      expired: {
        clear: true,
        intervalMs: 900000, //ms = 15min
      },
    }),
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      httpOnly: true,
      secure: false,
    },
  });
}
