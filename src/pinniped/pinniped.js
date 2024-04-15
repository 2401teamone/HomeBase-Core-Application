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
    await this.logger.createTable();
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
    this.onGetAllRows = new PinnipedEvent(this.emitter, "GET_ALL_ROWS");
    // this.onGetOneRow = new PinnipedEvent(this.emitter, "GET_ALL_ROWS");
    // this.onGetAllRows = new PinnipedEvent(this.emitter, "GET_ALL_ROWS");
    // this.onGetAllRows = new PinnipedEvent(this.emitter, "GET_ALL_ROWS");
    // this.onGetAllRows = new PinnipedEvent(this.emitter, "GET_ALL_ROWS");
    // this.onGetAllRows = new PinnipedEvent(this.emitter, "GET_ALL_ROWS");
    // this.onGetAllRows = new PinnipedEvent(this.emitter, "GET_ALL_ROWS");
  }

  /**
   * Returns an object that adds an event handler and trigger events of the type: "GET_ALL_ROWS".
   * The callback passed to add is executed when the event is heard on the passed in tables.
   * @param {...string} tables
   * @returns {object}
   */
  onGetAllRows(...tables) {
    return new PinnipedEvent(this.emitter, "GET_ALL_ROWS", tables);
  }

  onGetOneRow(...tables) {
    return new PinnipedEvent(this.emitter, "GET_ONE_ROW", tables);
  }

  onCreateOneRow(...tables) {
    return new PinnipedEvent(this.emitter, "CREATE_ONE_ROW", tables);
  }

  onUpdateOneRow(...tables) {
    return new PinnipedEvent(this.emitter, "UPDATE_ONE_ROW", tables);
  }

  onDeleteOneRow(...tables) {
    return new PinnipedEvent(this.emitter, "DELETE_ONE_ROW", tables);
  }

  onBackupDatabase() {
    return new PinnipedEvent(this.emitter, "BACKUP_DATABASE");
  }

  onRegisterUser() {
    return new PinnipedEvent(this.emitter, "REGISTER_USER");
  }

  onRegisterAdmin() {
    return new PinnipedEvent(this.emitter, "REGISTER_ADMIN");
  }

  onLoginUser() {
    return new PinnipedEvent(this.emitter, "LOGIN_USER");
  }

  onLoginAdmin() {
    return new PinnipedEvent(this.emitter, "LOGIN_ADMIN");
  }

  onLogout() {
    return new PinnipedEvent(this.emitter, "LOGOUT");
  }

  onCustomRoute() {
    return new PinnipedEvent(this.emitter, "CUSTOM_ROUTE");
  }

  onGetTableMeta() {
    return new PinnipedEvent(this.emitter, "GET_TABLE_META");
  }

  onCreateTable() {
    return new PinnipedEvent(this.emitter, "CREATE_TABLE");
  }

  onUpdateTable() {
    return new PinnipedEvent(this.emitter, "UPDATE_TABLE");
  }

  onDropTable() {
    return new PinnipedEvent(this.emitter, "DROP_TABLE");
  }
}

export const MigrationDao = DAO;
export const pnpd = Pinniped.createApp;
