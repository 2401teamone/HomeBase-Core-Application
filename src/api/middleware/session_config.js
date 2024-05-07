import session from "express-session";
// import store from "better-sqlite3-session-store";
// import sqlite from "better-sqlite3";
import fs from "fs";
import knex from "knex";
import connectSessionKnex from "connect-session-knex";

import {
  createSessionSecret,
  saveSessionSecret,
} from "../../utils/create_session_secret.js";

// const SqliteStore = store(session);
if (!fs.existsSync("pnpd_data")) fs.mkdirSync("pnpd_data");

//creating a new knex connection with better-sqlite3 as the client
let db = knex({
  client: "better-sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: "pnpd_data/pnpd.db",
  },
  pool: {
    afterCreate: function (connection, done) {
      connection.pragma("journal_mode = WAL");
      done(false, connection);
    },
  },
});

if (!process.env.SESSION_SECRET) {
  const secret = createSessionSecret();
  saveSessionSecret(secret);
  process.env.SESSION_SECRET = secret;
}

export default function sessionConfig() {
  return session({
    store: new (connectSessionKnex(session))({
      knex: db,
      clearInterval: 60000, // 1 min
    }),
    //setting up session store
    // store: new SqliteStore({
    //   client: db,
    //   expired: {
    //     clear: true,
    //     intervalMs: 900000, //ms = 15min
    //   },
    // }),
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
