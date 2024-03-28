import bcrypt from "bcrypt";
import { Router } from "express";
import catchError from "../../utils/catch_error.js";
import { AuthenticationError } from "../../utils/errors.js";
import generateUuid from "../../utils/generate_uuid.js";
import ResponseData from "../../models/response_data.js";
import parseJsonColumns from "../../utils/parse_json_columns.js";
import { validateUser } from "../middleware/validate_user.js";
import {
  validatePostMeetsRequiredFields,
  validateRequestMeetsCustomValidation,
  validateRequestMeetsUniqueValidation,
} from "../middleware/validate_record.js";
import loadUsersTableContext from "../middleware/load_users_table_context.js";

/**
 * Creates an Express Router object
 * That sets middleware and handlers for
 * The designated authentication routes.
 * @param {object HB} app
 * @returns {object Router} router
 */
export default function generateAuthRouter(app) {
  const router = Router();
  const authApi = new AuthApi(app);

  router.get("/", catchError(authApi.getUserHandler()));
  router.post(
    "/register",
    loadUsersTableContext(app),
    validateUser(app),
    validatePostMeetsRequiredFields(),
    validateRequestMeetsCustomValidation(),
    validateRequestMeetsUniqueValidation(app),
    catchError(authApi.registerHandler())
  );
  router.patch(
    "/:id/username",
    loadUsersTableContext(app),
    validateUser(app),
    catchError(authApi.updateUsername())
  );
  router.patch("/:id/password", catchError(authApi.updatePasswordHandler()));
  router.post("/login", catchError(authApi.loginHandler()));
  router.post("/admin/register", catchError(authApi.registerAdminHandler()));
  router.post("/admin/login", catchError(authApi.loginAdminHandler()));
  router.post("/logout", catchError(authApi.logoutHandler()));
  router.get("/admin/registered", catchError(authApi.adminExistsHandler()));

  return router;
}

class AuthApi {
  constructor(app) {
    this.app = app;
  }

  getUserHandler() {
    return (req, res, next) => {
      res.status(200).json({ user: req.session.user });
    };
  }

  /**
   * Returns a handler function that creates a new user.
   * It checks if the username already exists.
   * And if not, then creates the user and saves the credentials in the 'users' table.
   * @returns {function}
   */
  registerHandler() {
    return async (req, res, next) => {
      const { table } = res.locals;

      if (table.createRule === "creator" && req.session.user) {
        req.body.creator = req.session.user.id;
      }

      delete req.body.passwordConfirm;

      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      let createdUser = await this.app.getDAO().createOne("users", {
        ...req.body,
        id: generateUuid(),
        password: hashedPassword,
        role: "user",
      });

      createdUser = createdUser[0];

      delete createdUser.password;
      parseJsonColumns(table, [createdUser]);

      console.log("User created :", createdUser);

      const responseData = new ResponseData(req, res, createdUser);

      await this.app.onRegisterUser().trigger(responseData);
      if (responseData.responseSent()) return null;

      res.status(201).json(responseData.formatGeneralResponse());
    };
  }

  updateUsername() {
    return async (req, res, next) => {
      const { table } = res.locals;
      const { id } = req.params;
      const { username } = req.body;

      let updatedUser = await this.app.getDAO().updateOne("users", id, {
        username,
      });

      updatedUser = updatedUser[0];

      delete updatedUser.password;
      parseJsonColumns(table, [updatedUser]);

      const responseData = new ResponseData(req, res, updatedUser);

      if (responseData.responseSent()) return null;

      res.status(200).json(responseData.formatGeneralResponse());
    };
  }

  updatePasswordHandler() {
    return async (req, res, next) => {
      const { id } = req.params;
      const { password } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const updatedUser = await this.app.getDAO().updateOne("users", id, {
        password: hashedPassword,
      });

      delete updatedUser.password;

      const responseData = new ResponseData(req, res, updatedUser);

      if (responseData.responseSent()) return null;

      res.status(200).json(responseData.formatGeneralResponse());
    };
  }

  /**
   * Returns a handler that adds an admin user to the 'admins' table.
   * It checks if the username already exists, and if not, adds the user to the 'admin' table.
   * @returns {function}
   */
  registerAdminHandler() {
    return async (req, res, next) => {
      const { username, password } = req.body;

      // Checks if 'username' exists in 'users'.
      const existingAdmin = await this.app
        .getDAO()
        .search("admins", { username });
      if (existingAdmin.length)
        throw new AuthenticationError("Username not available");

      // Hashes the inputted password and inserts this admin's credentials into the 'admin' table.
      const hashedPassword = await bcrypt.hash(password, 10);
      const createdAdmin = await this.app.getDAO().createOne("admins", {
        id: generateUuid(),
        username,
        password: hashedPassword,
        role: "admin",
      });

      delete createdAdmin[0].password;
      console.log("Admin Created: ", createdAdmin[0]);

      const responseData = new ResponseData(req, res, {
        user: createdAdmin[0].username,
      });
      await this.app.onRegisterAdmin().trigger(responseData);
      if (responseData.responseSent()) return null;

      res.status(201).json(responseData.formatGeneralResponse());
    };
  }

  /**
   * Returns a handler that logs in a user.
   * It checks if the credentials exist:
   *  If the username is found in 'users',
   *  And if the inputted password hashed matches the hashed password in 'users'.
   * If the credentials match, then the user's session is established.
   * @returns {function}
   */
  loginHandler() {
    return async (req, res, next) => {
      const { username, password } = req.body;

      const existingUser = await this.app
        .getDAO()
        .search("users", { username });
      if (!existingUser.length) throw new AuthenticationError();

      const match = await bcrypt.compare(password, existingUser[0].password);
      if (!match) throw new AuthenticationError();

      req.session.user = existingUser[0];
      delete req.session.user.password;

      console.log("Logged in user: ", req.session.user);
      const responseData = new ResponseData(req, res, {
        user: req.session.user,
      });
      await this.app.onLoginUser().trigger(responseData);
      if (responseData.responseSent()) return null;

      res.status(200).send(responseData.formatGeneralResponse());
    };
  }

  /**
   * Returns a handler that logs in an admin.
   * It checks if the credentials for the admin exists in 'admins',
   * And checks if the credentials inputted match the saved admin in 'admin'.
   * If the credentials match, then the admin's session is established.
   * @returns {function}
   */
  loginAdminHandler() {
    return async (req, res, next) => {
      const { username, password } = req.body;

      const existingAdmin = await this.app
        .getDAO()
        .search("admins", { username });
      if (!existingAdmin.length) throw new AuthenticationError();

      const match = await bcrypt.compare(password, existingAdmin[0].password);
      if (!match) throw new AuthenticationError();

      req.session.user = existingAdmin[0];
      delete req.session.user.password;

      console.log("Logged in Admin: ", req.session.user);
      const responseData = new ResponseData(req, res, {
        user: req.session.user,
      });
      await this.app.onLoginAdmin().trigger(responseData);
      if (responseData.responseSent()) return null;

      res.status(200).send(responseData.formatGeneralResponse());
    };
  }

  /**
   * Returns a handler that logs out the current session's user.
   * @returns {function}
   */
  logoutHandler() {
    return async (req, res, next) => {
      console.log("Logging out user: ", req.session.user);
      const responseData = new ResponseData(req, res, "User Logged Out");

      await this.app.onLogout().trigger(responseData);

      if (responseData.responseSent()) return null;

      delete req.session.user;

      res.status(200).json(responseData.formatGeneralResponse());
    };
  }

  /**
   * Checks if there is an admin in the admins table
   * @returns {function}
   */
  adminExistsHandler() {
    return async (req, res, next) => {
      const existingAdmin = await this.app.getDAO().getAll("admins");
      if (existingAdmin.length) {
        res.status(200).json({ registered: true });
      } else {
        res.status(200).json({ registered: false });
      }
    };
  }
}
