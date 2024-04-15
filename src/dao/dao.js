import knex from "knex";
import { BadRequestError } from "../utils/errors.js";
import Column from "../models/column.js";
import fs from "fs";

/**
 * DAO (Data Access Object) Class
 * Interacts with Sqlite3 Database through the interface of Knex.
 */
class DAO {
  constructor(connection) {
    this.sqlite3Connection;
    this.db = connection ? connection : this._connect(this);
  }

  /**
   * Connects to the Better-Sqlite3 Database with Knex.
   * Allows for queries to be chained to the returned Knex instance.
   * @returns {Knex Instance}
   */
  _connect(thisDAO) {
    if (!fs.existsSync("pnpd_data")) fs.mkdirSync("pnpd_data");
    if (!fs.existsSync("pnpd_data/migrations")) {
      fs.mkdirSync("pnpd_data/migrations");
    }

    let db = knex({
      client: "better-sqlite3",
      useNullAsDefault: true,
      connection: {
        filename: "pnpd_data/pnpd.db",
      },
      pool: {
        afterCreate: function (connection, done) {
          thisDAO.sqlite3Connection = connection;
          connection.pragma("journal_mode = WAL");
          connection.pragma("foreign_keys = ON");
          done(false, connection);
        },
      },
      migrations: {
        directory: "./pnpd_data/migrations",
        tableName: "knex_migrations",
      },
    });

    return db;
  }

  async disconnect() {
    await this.getDB().destroy();
  }

  /**
   * Obtains the Knex instance that connected to the database.
   * If the transaction connection to the database exists,
   * But the transaction is not completed: return this.trxDB.
   * If the transaction connection doesn't exist,
   * Or the transaction is completed: return this.DB.
   * @returns {object Transaction} Knex Instance - this.db || this.trxDB
   */
  getDB() {
    return this.db;
  }

  /**
   * @returns {object better-sqlite3 connection}
   */
  async getRawSqliteConnection() {
    // adds a connection to the knex pool so dao has access to the raw sqlite3 connection
    if (!this.sqlite3Connection) {
      await this.getDB()("sqlite_master").select("*").limit(1);
    }
    return this.sqlite3Connection;
  }

  /**
   * Uses better-sqlite3 connection to run a backup on the same knex connection as main app is using.
   * @params
   * @returns {undefined}
   */
  async dbBackup(filename) {
    let connection = await this.getRawSqliteConnection();

    // matches the filename from the full filepath
    let dbName = connection.name.match(/[^\\/]+$/)[0];

    if (!fs.existsSync("pnpd_data/backup")) fs.mkdirSync("pnpd_data/backup");

    let newName;
    if (filename === "" || filename === undefined) {
      newName = `backup_${Date.now()}_${dbName}`;
    } else {
      newName = `backup_${Date.now()}_${filename}`;
    }

    let newPath = `pnpd_data/backup/${newName}`;

    await connection.backup(newPath);

    return newPath;
  }

  /**
   * Creates a transaction and invokes the callback given.
   * If the callback is successful, it commits the transaction.
   * Otherwise, it'll rollback the transaction.
   * @param {function} callback
   * @return {undefined} result
   */
  async runTransaction(callback) {
    const trx = await this.getDB().transaction();
    try {
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch (e) {
      await trx.rollback();
      throw new Error(e);
    }
  }

  async tableExists(tableName) {
    const exists = await this.getDB().schema.hasTable(tableName);
    return exists;
  }

  /**
   * Searches the table 'tablemeta' and filters based on the name parameter.
   * Receives an instance of Table if found.
   * @param {string} tableName
   * @returns {object Table} table
   */
  async findTableByName(tableName) {
    try {
      const table = await this.getDB()("tablemeta")
        .select("*")
        .where({ name: tableName });
      return table;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * Searches the table 'tablemeta' and filters based on the ID parameter.
   * @param {string} id
   * @returns {object Table} table
   */
  async findTableById(id) {
    try {
      const table = await this.getDB()("tablemeta").select("*").where({ id });
      return table;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * Searches the table 'tablemeta' and filters based on the name or ID parameter.
   * @param {string} nameOrId
   * @returns {object Table} table
   */
  async findTableByNameOrId(nameOrId) {
    try {
      const table = await this.getDB()("tablemeta")
        .select("*")
        .where({ name: nameOrId })
        .orWhere({ id: nameOrId });
      return table;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * With the additional parameter, fields, to search for specific rows filtered by specific columns.
   * Searches within a table with the given parameter in the database,
   * @param {string} tableName
   * @param {object} fields
   * @returns {object[]} rows
   */
  async search(tableName, fields) {
    const rows = await this.getDB()(tableName).select("*").where(fields);
    return rows;
  }

  /**
   * Searches a table for columns' values that match the provided fields' values.
   * Returns true if the values are unique, false otherwise.
   * @param {string} tableName
   * @param {object} fields
   * @returns {boolean} isUnique
   */
  async checkUnique(tableName, fields, rowId) {
    const check = this.getDB()(tableName).count("id").where(fields);
    if (rowId) {
      check.whereNot({ id: rowId });
    }
    const [count] = await check;
    return Object.values(count)[0] === 0;
  }

  /**
   * Returns all the requested rows from the specific queried table.
   * @param {string} tableName - name of the table
   * @param {number} [pageNum] - page number of the results
   * @param {number} [limit] - number of rows to return
   * @param {string} [sortBy="created_at"] - column to sort by
   * @param {string} [order="asc"] - asc or desc
   * @returns {object[]} rows
   */
  async getAll(
    tableName,
    pageNum,
    limit,
    sortBy = "created_at",
    order = "asc"
  ) {
    try {
      if (pageNum && limit) {
        const rows = await this.getDB()(tableName)
          .select("*")
          .orderBy(sortBy, order)
          .offset((pageNum - 1) * limit)
          .limit(limit);
        return rows;
      } else {
        const rows = await this.getDB()(tableName);
        return rows;
      }
    } catch (e) {
      if (e.message.includes("no such column")) {
        throw new BadRequestError("orderBy column does not exist");
      }
      throw new Error(e.message);
    }
  }

  /**
   * Receives a single row based on the rowId passed, in the table, tableName.
   * @param {string} tableName
   * @param {string} rowId
   * @returns {object[]} row
   */
  async getOne(tableName, rowId) {
    const row = await this.getDB()(tableName).select("*").where({ id: rowId });
    return row;
  }

  /**
   * Creates a new row in the specified table and returns the new row.
   * @param {string} tableName
   * @returns {object[]} newRow
   */
  async createOne(tableName, newRow) {
    try {
      const createdRow = await this.getDB()(tableName)
        .returning("*")
        .insert(newRow);
      return createdRow;
    } catch (e) {
      console.log(e);
      if (e.message.slice(0, 11) === "insert into") {
        throw new BadRequestError();
      } else {
        throw new Error(e.message);
      }
    }
  }

  /**
   * Finds the row in tableName based on the rowId,
   * And updates that row based on the properties of newRow.
   * Returns updatedRow.
   * @param {string} tableName
   * @param {string} rowId
   * @param {object} newRow
   * @returns {object} updatedRow
   */
  async updateOne(tableName, rowId, newRow) {
    const updatedRow = await this.getDB()(tableName)
      .returning("*")
      .where({ id: rowId })
      .update(newRow);
    return updatedRow;
  }

  /**
   * Deletes the row in tableName based on rowId.
   * @param {string} tableName
   * @param {string} rowId
   */
  async deleteOne(tableName, rowId) {
    await this.getDB()(tableName).where({ id: rowId }).del();
  }

  /**
   * Creates the tablemeta table in the database.
   * @returns {Promise <undefined>}
   */
  async createTablemeta() {
    await this.getDB().schema.createTable("tablemeta", function (table) {
      table.text("id").primary();
      table.text("name").unique().notNullable();
      table.text("type").notNullable();
      table.text("columns").notNullable();
      table.text("getAllRule").defaultTo("admin");
      table.text("getOneRule").defaultTo("admin");
      table.text("createRule").defaultTo("admin");
      table.text("updateRule").defaultTo("admin");
      table.text("deleteRule").defaultTo("admin");
      table.text("options").defaultTo("{}");
    });
  }

  /**
   * A modified version of createOne, but inserts an object
   * Specifically into 'tablemeta'.
   * @param {id: string, name: string, columns: 'stringJSON'} tableData
   * @return {object} createdRow
   */
  async addTableMetaData(tableData) {
    const createdRow = await this.getDB()("tablemeta")
      .returning("*")
      .insert(tableData);
    return createdRow;
  }

  /**
   * Updates the row in 'tablemeta' with the properties contained within tableData.
   * @param {id: string, name: string, columns: stringJSON} tableData
   * @param {object Transaction} trx
   * @return {object} updatedRow
   */
  async updateTableMetaData(tableData) {
    const updatedRow = await this.getDB()("tablemeta")
      .returning("*")
      .where({ id: tableData.id })
      .update(tableData);
    return updatedRow;
  }

  /**
   * Deletes a row from the `tablemeta` table
   * Specifically into 'tablemeta'.
   * @param {string} tableId
   */
  async deleteTableMetaData(tableId) {
    await this.getDB()("tablemeta").where({ id: tableId }).del();
  }

  /**
   * Creates a table within the database,
   * Then adds the columns to modify the table's structure.
   * @param {object Table} table
   * @returns {Promise <undefined>}
   */
  async createTable(table) {
    const name = table.name;
    const columns = table.columns;
    const type = table.type;

    return await this.getDB().schema.createTable(name, (table) => {
      table.specificType(
        "id",
        "TEXT PRIMARY KEY DEFAULT ('r'||lower(hex(randomblob(7)))) NOT NULL"
      );
      table.specificType("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      table.specificType("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

      if (type === "auth") {
        table.specificType("username", "TEXT NOT NULL");
        table.specificType("password", "TEXT NOT NULL");
        table.specificType("role", "TEXT DEFAULT ''");
      }

      columns.forEach((column) => {
        this._addColumnPerSpecs(column, table);
      });
    });
  }

  /**
   * Drops the specified table from the database.
   * @param {string} tableName
   */
  async dropTable(tableName) {
    await this.getDB().schema.dropTable(tableName);
  }

  /**
   * Renames the current table, tableName, with newName.
   * @param {string} tableName
   * @param {string} newName
   */
  async renameTable(tableName, newName) {
    await this.getDB().schema.renameTable(tableName, newName);
  }

  /**
   * Adds the column to the specified table.
   * @param {string} tableName
   * @param {object Column} column
   */
  async addColumn(tableName, column) {
    await this.getDB().schema.table(tableName, (table) => {
      this._addColumnPerSpecs(column, table);
    });
  }

  /**
   * Renames a specific column with newName in table, tableName.
   * @param {string} tableName
   * @param {string} name
   * @param {string} newName
   */
  async renameColumn(tableName, name, newName) {
    await this.getDB().schema.table(tableName, (table) => {
      table.renameColumn(name, newName);
    });
  }

  /**
   * Drops the column, columnName, in tableName.
   * @param {string} tableName
   * @param {string} columnName
   */
  async dropColumn(tableName, columnName) {
    await this.getDB().schema.table(tableName, (table) => {
      table.dropColumn(columnName);
    });
  }

  /**
   * Internal method. Conditionally adds the specific column onto the table object received. Used in both createTable and addColumn.
   * @param {object Column} column
   * @param {object knex table instance} table
   */
  _addColumnPerSpecs(column, table) {
    if (column.type === "relation") {
      table.specificType(column.name, "TEXT");
      table
        .foreign(column.name)
        .references("id")
        .inTable(column.options.tableName)
        .onDelete(column.options.cascadeDelete ? "CASCADE" : "SET NULL")
        .onUpdate("CASCADE");
    } else {
      table.specificType(column.name, Column.COLUMN_MAP[column.type].sql);
    }
  }
}

export default DAO;
