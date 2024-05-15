import initApi from "../api/init_api.js";
import DAO from "../dao/dao.js";
import LogDao from "../dao/log_dao.js";
import EventEmitter from "events";
import registerProcessListeners from "../utils/register_process_listeners.js";
import { InvalidCustomRouteError } from "../utils/errors.js";
import Table from "../models/table.js";
import PinnipedEvent from "../models/pnpd_event.js";
import Server from "./server.js";

/**
 * Pinniped Class
 * Runs the application of the backend.
 * Offers extensibility of custom routes.
 */
class Pinniped {
  static createApp(config) {
    return new Pinniped(config);
  }

  constructor(config) {
    this.config = config;
    this.DAO = new DAO();
    this.logger = new LogDao();
    this.emitter = new EventEmitter();
    this.customRoutes = [];
    this.dataBaseSetup();
    this.initEvents();
  }

  async dataBaseSetup() {
    await this.runLatestMigrations();
    await this.seedDatabase();
    // await this.logger.createTable();
  }
  /**
   * Seeds the database with the necessary tables.
   * If the tables do not exist, it creates them.
   * If the tables do exist, it does nothing.
   * If the tables are not created, it throws an error.
   * @returns {Promise}
   * @throws {Error}
   */
  async seedDatabase() {
    try {
      const usersExists = await this.getDAO().tableExists("users");
      const adminsExists = await this.getDAO().tableExists("admins");

      if (!usersExists) {
        const users = new Table({
          name: "users",
          type: "auth",
          options: {
            minUsernameLength: 4,
            minPasswordLength: 8,
            pattern:
              "^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$",
          },
        });
        await users.create();
      }

      if (!adminsExists) {
        const admins = new Table({
          name: "admins",
          type: "auth",
        });
        await admins.create();
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Runs any migrations that haven't run yet after setting up tablemeta
   * @returns {undefined}
   */
  async runLatestMigrations() {
    const tablemetaExists = await this.getDAO().tableExists("tablemeta");
    if (!tablemetaExists) {
      await this.getDAO().createTablemeta();
    }
    await this.DAO.getDB().migrate.latest();
  }

  /**
   * Allows developers to add their own route
   * That can receive a HTTP request to the given path.
   * When that path is reached with the appropriate method,
   * It'll invoke the function, handler.
   * @param {string} method
   * @param {string} path
   * @param {function} handler
   */
  addRoute(method, path, handler) {
    const VALID_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
    if (!VALID_METHODS.includes(method)) {
      throw new InvalidCustomRouteError(
        `Please provide one of the valid methods: ${VALID_METHODS}`
      );
    }
    if (path.startsWith("/api"))
      throw new InvalidCustomRouteError(
        "Cannot use '/api' as the beginning of your route, as it is saved for pre-generated routes."
      );
    if (typeof handler !== "function")
      throw new InvalidCustomRouteError(
        "Please provide a function as your handler."
      );

    this.customRoutes.push({ method, path, handler });
  }

  /**
   * Returns the app's DAO instance.
   * @returns {object DAO}
   */
  getDAO() {
    return this.DAO;
  }

  /**
   * Starts the server on the given port, and registers process event handlers.
   * @param {number} port
   */
  start() {
    registerProcessListeners(this);

    const expressApp = initApi(this);

    const server = new Server(expressApp, this.config);
    server.start();
  }

  initEvents() {
    this.onGetAllRows = new PinnipedEvent(this.emitter, "getAllRows");
    this.onGetOneRow = new PinnipedEvent(this.emitter, "getOneRow");
    this.onCreateOneRow = new PinnipedEvent(this.emitter, "createOneRow");
    this.onUpdateOneRow = new PinnipedEvent(this.emitter, "updateOneRow");
    this.onDeleteOneRow = new PinnipedEvent(this.emitter, "deleteOneRow");
    this.onBackupDatabase = new PinnipedEvent(this.emitter, "backupDatabase");
    this.onRegisterUser = new PinnipedEvent(this.emitter, "registerUser");
    this.onRegisterAdmin = new PinnipedEvent(this.emitter, "registerAdmin");
    this.onLoginUser = new PinnipedEvent(this.emitter, "loginUser");
    this.onLoginAdmin = new PinnipedEvent(this.emitter, "loginAdmin");
    this.onLogout = new PinnipedEvent(this.emitter, "logout");
    this.onCustomRoute = new PinnipedEvent(this.emitter, "customRoute");
    this.onGetTableMeta = new PinnipedEvent(this.emitter, "getTableMeta");
    this.onCreateTable = new PinnipedEvent(this.emitter, "createTable");
    this.onUpdateTable = new PinnipedEvent(this.emitter, "updateTable");
    this.onDropTable = new PinnipedEvent(this.emitter, "dropTable");
  }
}

export const MigrationDao = DAO;
export const pnpd = Pinniped.createApp;
