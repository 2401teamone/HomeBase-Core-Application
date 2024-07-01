import fs from "fs";

class LogDao {
  constructor() {}

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

  async deleteLog(id) {
    console.log(id);
    const data = fs.readFileSync("./pnpd_data/server.logs", "utf-8");
    let lines = data.split("\n");
    const logIndex = lines.findIndex((log) => log.includes(id));
    lines.splice(logIndex, 1);
    fs.writeFileSync("./pnpd_data/server.logs", lines.join("\n"));
  }

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
