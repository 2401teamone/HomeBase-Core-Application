import { TableNotFoundError, BadRequestError } from "../../utils/errors.js";
import catchError from "../../utils/catch_error.js";
import Table from "../../models/table.js";

/**
 * Finds the table relevant to the current request in tablemeta, creates
 * a Table modle instance, and mounts it to res.locals for later us in the
 * request response cycle
 * @param {object App} app
 * @returns {function} catchError
 */
export default function loadTableContext(app) {
  return catchError(async (req, res, next) => {
    const { table } = req.params;
    if (!table) throw new BadRequestError("Table Name or ID is required.");

    if (!app.tableContext[table]) {
      await app.updateTableContext(table)
    }

    res.locals.table = app.tableContext[table];
    next();
  });
}
