import { TableNotFoundError } from "../../utils/errors.js";
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
    const { tableId } = req.params;
    if (!tableId) throw new BadRequestError("Table ID is required.");
    
    let foundTable = await app.getDAO().findTableById(tableId);
    if (!foundTable.length) throw new TableNotFoundError(tableId);
    foundTable = foundTable[0];

    const tableContext = new Table(foundTable);

    res.locals.table = tableContext;
    next();
  });
}
