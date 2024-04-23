import fs from "fs";
import { Router } from "express";
import catchError from "../../utils/catch_error.js";
import ResponseData from "../../models/response_data.js";
import adminOnly from "../middleware/admin_only.js";
import isValidPath from "../../utils/is_valid_path.js";

export default function generateAdminRouter(app) {
  const router = Router();
  const adminAPI = new AdminAPI(app);

  router.use(adminOnly());

  router.get("/logs", catchError(adminAPI.getLogsHandler()));
  router.delete("/logs/:id", catchError(adminAPI.deleteLogHandler()));

  router.get("/backups", catchError(adminAPI.getBackupsHandler()));
  router.get(
    "/backups/:filename",
    catchError(adminAPI.downloadBackupHandler())
  );
  router.post("/backups", catchError(adminAPI.makeBackupHandler()));
  router.delete(
    "/backups/:filename",
    catchError(adminAPI.deleteBackupHandler())
  );

  return router;
}

class AdminAPI {
  constructor(app) {
    this.app = app;
  }

  getLogsHandler() {
    return async (req, res, next) => {
      const logs = await this.app.logger.getLogs();

      res.status(200).json({ logs });
    };
  }

  deleteLogHandler() {
    return async (req, res, next) => {
      const { id } = req.params;
      await this.app.logger.deleteLog(id);
      res.status(204).end();
    };
  }

  getBackupsHandler() {
    return async (req, res, next) => {
      fs.readdir("pnpd_data/backup", (err, files) => {
        if (err) {
          console.error(err);
          res.status(500).end();
        } else {
          const backups = files;
          res.status(200).json({ backups });
        }
      });
    };
  }

  makeBackupHandler() {
    return async (req, res, next) => {
      const { filename } = req.body;

      if (filename.length > 0 && !/^[a-zA-Z0-9]+\.db$/.test(filename)) {
        res.status(400).json({
          message: "Invalid backup name",
        });
        return;
      }

      let filePath = await this.app.getDAO().dbBackup(filename);
      let backupFileName = filePath.match(/[^\\/]+$/)[0];

      const responseData = new ResponseData(req, res, { backupFileName });

      this.app.emitter.once("backupDatabaseEnd", () => {
        if (responseData.responseSent()) return null;
        res.status(200).json(responseData.formatGeneralResponse());
      });

      await this.app.onBackupDatabase.triggerListeners(responseData);
    };
  }

  downloadBackupHandler() {
    return async (req, res, next) => {
      const { filename } = req.params;

      res.download("pnpd_data/backup", filename);
    };
  }

  deleteBackupHandler() {
    return async (req, res, next) => {
      let { filename } = req.params;

      const path = `pnpd_data/backup/${filename}`;

      if (!isValidPath(path)) {
        res.status(400).json({
          message: "Invalid path",
        });
        return;
      } else {
        fs.unlink(path, (err) => {
          if (err) {
            console.error(err);
            res.status(500).end();
          } else {
            res.status(204).end();
          }
        });
      }
    };
  }
}
