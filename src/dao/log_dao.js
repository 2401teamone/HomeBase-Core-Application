import knex from "knex";
import generateRandomUuid from "../utils/generate_uuid.js";
import fs from "fs";

/**
 * Creates an Knex instance that connects to the better-sqlite3 'logs.db'.
 */
class LogDao {
  constructor() {
    // this.db = knex({
    //   client: "better-sqlite3",
    //   useNullAsDefault: true,
    //   connection: {
    //     afterCreate: function (connection, done) {
    //       connection.pragma("journal_mode = WAL");
    //       done(false, connection);
    //     },
    //     filename: "pnpd_data/logs.db",
    //   },
    // });
  }

  /**
   *  Creates the table 'logs' with its appropriate schema, following the structure of the custom logs structure.
   */
  // async createTable() {
  //   const logsExists = await this.db.schema.hasTable("logs");

  //   if (!logsExists) {
  //     await this.db.schema.createTable("logs", (table) => {
  //       table.specificType("id", "TEXT PRIMARY KEY");
  //       table.integer("pid");
  //       table.integer("level");
  //       table.string("time");
  //       table.string("hostname");
  //       table.string("method");
  //       table.string("url");
  //       table.json("headers");
  //       table.integer("statusCode");
  //       table.integer("responseTime");
  //     });
  //   }
  // }

  async getLogs() {
    const data = fs.readFileSync("./pnpd_data/server.logs", "utf-8");
    const lines = data.split("\n").filter((line) => line.trim() !== ""); // Split into lines and remove empty lines

    const objectsArray = lines.map((line) => {
      try {
        return this.parseLog(line);
      } catch (error) {
        console.error("Error parsing JSON:", error, "Line:", line);
        return null;
      }
    });
    return objectsArray;
  }

  // async getLogs() {
  //   return this.db("logs").select("*");
  // }

  // async insertLog(log) {
  //   return this.db("logs")
  //     .insert(log)
  //     .catch((err) => console.error(err));
  // }

  async deleteLog(id) {
    await this.db("logs").where({ id }).del();
  }

  /**
   * @return {object}
   * Within the returned object contains a write method that optionally writes to 'logs.db'
   * On the condition that the request URL within the log is not from the '/api/admin/logs/ path or '/api/auth/' path.
   * This object gets returned to the Pino instance which allows this method to run on every log.
   */
  // sqliteStream() {
  //   return {
  //     write: (log) => {
  //       const parsedLog = this.parseLog(log);
  //       if (
  //         parsedLog.url.startsWith("/api/admin/logs") ||
  //         parsedLog.url === "/api/auth/"
  //       )
  //         return;

  //         // new TextEncoder().encode(JSON.stringify(parsedLog).length) / 1024
  //       );
  //       this.insertLog({ id: generateRandomUuid(), ...parsedLog });
  //     },
  //   };
  // }

  /**
   * @param {obj} log
   * Custom log structure that is extracted from Pino's default log structure.
   */
  parseLog(log) {
    const parsedLog = JSON.parse(log);
    const copy = { ...parsedLog };

    const {
      pid,
      level,
      time,
      hostname,
      req: { method, url, headers, id },
      res: { statusCode },
      responseTime,
    } = copy;

    return {
      id,
      pid,
      level,
      time,
      hostname,
      method,
      url,
      headers,
      statusCode,
      responseTime,
    };
  }
}

export default LogDao;
