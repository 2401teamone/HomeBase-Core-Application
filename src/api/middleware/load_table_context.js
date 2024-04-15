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

    let foundTable = await app.getDAO().findTableByNameOrId(table);
    if (!foundTable.length) throw new TableNotFoundError(table);
    foundTable = foundTable[0];

    const tableContext = new Table(foundTable);

    res.locals.table = tableContext;
    next();
  });
}
