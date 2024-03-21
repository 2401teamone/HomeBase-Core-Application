import { Router } from "express";

import Table from "../../models/table.js";
import loadTableContext from "../middleware/load_table_context.js";
import adminOnly from "../middleware/admin_only.js";
import catchError from "../../utils/catch_error.js";
import { BadRequestError } from "../../utils/errors.js";
import ResponseData from "../../models/response_data.js";

/**
 * Creates an Express Router object
 * That sets middleware and handler functions for
 * The designated schema routes.
 * @param {object HB} app
 * @returns {object Router} router
 */
export default function generateSchemaRouter(app) {
  const router = Router();
  const schemaApi = new SchemaApi(app);

  // router.use(adminOnly());
  router.get("/", catchError(schemaApi.getAllTablesHandler()));
  router.post("/", catchError(schemaApi.createTableHandler()));
  router.put(
    "/:tableId",
    loadTableContext(app),
    catchError(schemaApi.updateTableHandler())
  );
  router.delete(
    "/:tableId",
    loadTableContext(app),
    catchError(schemaApi.dropTableHandler())
  );

  return router;
}

/**
 * SchemaApi Class
 * Creates an object that contains the methods needed for schema changes.
 */
class SchemaApi {
  constructor(app) {
    this.app = app;
  }

  /**
   * Returns a function that grabs all the rows from 'tablemeta'.
   * Each row in 'tablemeta' represents a table in the Sqlite3 database.
   * @returns {function}
   */
  getAllTablesHandler() {
    return async (req, res, next) => {
      let allTableMeta = await this.app.getDAO().getAll("tablemeta");
      allTableMeta = allTableMeta.map((table) => new Table(table));
      res.json({ tables: allTableMeta });
    };
  }

  /**
   * Returns a handler function that creates a table to the database.
   * It adds the metadata of the new table to 'tablemeta',
   * And creates the table within the Sqlite3 database using the DAO instance.
   * @returns {function}
   */
  createTableHandler() {
    return async (req, res, next) => {
      const table = new Table(req.body);
      await table.create();
      res.status(200).json({ table });
    };
  }

  /**
   * Returns a handler function that updates the table schema in the database.
   * It searches for the specific row in 'tablemeta' that represents the table to be updated,
   * And updates that row with the requested information.
   * Then it updates that table's schema within the Sqlite database.
   * @returns {function}
   */
  updateTableHandler() {
    return async (req, res, next) => {
      const oldTable = res.locals.table;
      const newTable = new Table(req.body);

      await oldTable.updateTo(newTable);
      res.json({ table: newTable });
    };
  }

  /**
   * Returns a handler function that drops the specified table
   * Based on the tableId passed in the request.
   * The table is dropped from the Sqlite3 database,
   * And the associated row in 'tablemeta' is dropped.
   * @returns {function}
   */
  dropTableHandler() {
    return async (req, res, next) => {
      const tableToDelete = res.locals.table;
      await tableToDelete.drop();

      res.status(204).end();
    };
  }
}
