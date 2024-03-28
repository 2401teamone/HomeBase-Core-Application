import express from "express";
import dotenv from "dotenv";
import pinoHttp from "pino-http";
import fs from "fs";
import { resolve } from "path";
dotenv.config();

//Routers
import generateCrudRouter from "./routers/crud.js";
import generateCustomRouter from "./routers/custom.js";
import generateSchemaRouter from "./routers/schema.js";
import generateAuthRouter from "./routers/auth.js";
import generateAdminRouter from "./routers/admin.js";

//Middleware
import errorHandler from "./middleware/error_handler.js";
import sanitize from "./middleware/sanitize.js";
import helmet from "helmet";
import cors from "cors";

//Session
import session from "express-session";
import store from "better-sqlite3-session-store";
import sqlite from "better-sqlite3";

const SqliteStore = store(session);
if (!fs.existsSync("pnpd_data")) fs.mkdirSync("pnpd_data");
const db = new sqlite("pnpd_data/session.db");

function initApi(app) {
  const server = express();

  server.use("/_", express.static("node_modules/pinniped/ui"));

  server.use(express.json());
  server.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  server.use(
    session({
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
    })
  );

  server.use(pinoHttp({ stream: app.logger.sqliteStream() }));
  server.use(sanitize());
  server.use(helmet());

  const authRouter = generateAuthRouter(app);
  const crudRouter = generateCrudRouter(app);
  const schemaRouter = generateSchemaRouter(app);
  const adminRouter = generateAdminRouter(app);
  const customRouter = generateCustomRouter(app);

  server.use("/api/auth", authRouter);
  server.use("/api/tables", crudRouter);
  server.use("/api/schema", schemaRouter);
  server.use("/api/admin", adminRouter);
  server.use("/", customRouter);

  // routes all of the front end routes back to index. Needed for static vite build
  server.get(
    ["/_/login", "/_/register", "/_/observability", "/_/data", "/_/settings"],
    (req, res, next) => {
      res.sendFile(resolve("node_modules/pinniped/ui/index.html"));
    }
  );

  server.use("/", express.static("dist"));
  server.get("/*", (req, res, next) => {
    res.sendFile(resolve("dist/index.html"));
  });

  server.get("*", (req, res, next) => {
    res.send("Page does not exist");
  });

  // Catch All Error Handler
  server.use(errorHandler);

  return server;
}

export default initApi;
