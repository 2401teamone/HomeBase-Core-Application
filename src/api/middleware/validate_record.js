import { BadRequestError } from "../../utils/errors.js";
import catchError from "../../utils/catch_error.js";
import { systemFields } from "../../utils/constants.js";

const isSystemField = (table, key) => {
  return systemFields
    .filter((field) => {
      if (field.type === "base") return true;
      if (field.type === "auth" && table.type === "auth") return true;
    })
    .map((field) => field.field)
    .includes(key);
};

export const validateRequestMeetsUniqueValidation = (app) => {
  return catchError(async (req, res, next) => {
    const { table } = res.locals;
    const { rowId } = req.params;

    for (let key in req.body) {
      if (isSystemField(table, key)) continue;
      let column = table.getColumnByName(key);
      if (!column)
        throw new BadRequestError("Column does not exist in the schema.");
      if (column.unique) {
        let val = req.body[key];
        const isUnique = await app
          .getDAO()
          .checkUnique(table.name, { [key]: val }, rowId);
        if (!isUnique) {
          throw new BadRequestError(`Value ${val} is not unique.`);
        }
      }
    }
    next();
  });
};

export const validatePostMeetsRequiredFields = () => {
  return catchError((req, res, next) => {
    const { table } = res.locals;

    const requiredColumns = table
      .getColumns()
      .filter((column) => column.required);
    for (let column of requiredColumns) {
      if (handleRequiredField(column.type, req.body[column.name])) {
        throw new BadRequestError(`Column ${column.name} is required.`);
      }
    }

    next();
  });
};

export const validatePatchMeetsRequiredFields = () => {
  return catchError((req, res, next) => {
    const { table } = res.locals;

    for (let key in req.body) {
      if (isSystemField(table, key)) continue;
      let val = req.body[key];
      let column = table.getColumnByName(key);
      if (column?.required && handleRequiredField(column.type, val)) {
        throw new BadRequestError(`Column ${key} is required.`);
      }
    }

    next();
  });
};

export const validateRequestMeetsCustomValidation = () => {
  return catchError((req, res, next) => {
    const { table } = res.locals;
    for (let key in req.body) {
      if (isSystemField(table, key)) continue;
      let column = table.getColumnByName(key);
      if (!column)
        throw new BadRequestError("Column does not exist in the schema.");
      let [isValid, errorMessage] = column.options.validate(req.body[key]);
      if (!isValid) throw new BadRequestError(errorMessage);
    }
    next();
  });
};

export const handleRequiredField = (type, val) => {
  switch (type) {
    case "text":
    case "number":
    case "password":
    case "email":
    case "url":
    case "date":
    case "json":
      return val === "";
    case "relation":
      return val === null;
    case "csv":
    case "select":
      return val.length === 0;
    case "bool":
      return val === null;
    default:
      return false;
  }
};
