import catchError from "../../utils/catch_error.js";
import { BadRequestError } from "../../utils/errors.js";
import Table from "../../models/table.js";

export default function loadUsersTableContext(app) {
  return catchError(async (req, res, next) => {
    let usersTable = await app.getDAO().findTableByName("users");
    if (!usersTable.length) throw new BadRequestError("Users table not found.");

    usersTable = usersTable[0];

    const usersTableContext = new Table(usersTable);

    res.locals.table = usersTableContext;

    // const { username, password } = req.body;

    // if (!username) {
    //   throw new BadRequestError("Username cannot be empty.");
    // }
    // const existingUser = await app.getDAO().search("users", { username });
    // if (existingUser.length)
    //   throw new AuthenticationError("Username not available.");

    // if (password.length < 10) {
    //   throw new BadRequestError("Password must be at least 10 characters");
    // }
    // if (!/(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) {
    //   throw new BadRequestError(
    //     "Password must contain at least one number and one special character"
    //   );
    // }

    next();
  });
}
