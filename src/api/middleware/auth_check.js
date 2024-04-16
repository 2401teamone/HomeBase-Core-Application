import catchError from "../../utils/catch_error.js";
import { ForbiddenError, UnauthenticatedError } from "../../utils/errors.js";

const ACCESS_LEVEL = {
  admin: 3,
  creator: 2,
  user: 2,
  public: 1, // unauthenticated
};

const API_RULE_KEY = {
  GETALL: "getAllRule",
  GET: "getOneRule",
  POST: "createRule",
  PUT: "updateRule",
  PATCH: "updateRule",
  DELETE: "deleteRule",
};

/**
 * Use after load_table_context middlewear to check the request details
 * the API rules associated with the requested table, and throw a 401 or 403
 * error if needed
 * @returns {function} middleware
 */
export default function authCheck() {
  return catchError(async (req, res, next) => {
    //Find out what action the user is trying to complete, and associate that with
    //the appropriate API rule.
    //If the method is GET and the path ends in "/rows", reassign method to "GETALL"
    res.locals.apiRule =
      req.method === "GET" && req.path.endsWith("/rows")
        ? API_RULE_KEY.GETALL
        : API_RULE_KEY[req.method];

    const { table } = res.locals;

    // User Access Level
    const sessionAccessLevel = req.session.hasOwnProperty("user")
      ? ACCESS_LEVEL[req.session.user.role]
      : ACCESS_LEVEL["public"];

    // Required Table Access Level
    const requiredAccessLevel = ACCESS_LEVEL[table[res.locals.apiRule]];

    // If the user is not authenticated, and needs to be, return a 401 error
    if (
      sessionAccessLevel === ACCESS_LEVEL["public"] &&
      requiredAccessLevel > ACCESS_LEVEL["public"]
    ) {
      throw new UnauthenticatedError();
    }

    // If the is authenticated but doesn't have the appropriate access level, return a 403 Error
    if (requiredAccessLevel > sessionAccessLevel) {
      throw new ForbiddenError(
        "You don't have the appropriate access for this table."
      );
    }

    next();
  });
}
