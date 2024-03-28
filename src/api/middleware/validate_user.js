import { BadRequestError } from "../../utils/errors.js";
import catchError from "../../utils/catch_error.js";

export const validateUser = (app) => {
  return catchError(async (req, res, next) => {
    const { username, password } = req.body;

    const isUnique = await app.getDAO().checkUnique("users", { username });
    if (!isUnique) {
      throw new BadRequestError(`Username ${username} is not unique.`);
    }

    next();
  });
};
