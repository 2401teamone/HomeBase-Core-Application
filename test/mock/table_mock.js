import knex from "knex";
import DAO from "./dao_mock.js";
import Column from "../../src/models/column.js";
import generateUuid from "../../src/utils/generate_uuid.js";

const DB = knex({
  client: "better-sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: "test/test_data/test.db",
  },
});

class Table {
  static API_RULES = [
    "getAllRule",
    "getOneRule",
    "createRule",
    "updateRule",
    "deleteRule",
  ];
  static API_RULE_VALUES = ["public", "user", "creator", "admin"];
  static DEFAULT_RULE = "public";

  constructor({
    id = generateUuid(),
    name = "",
    type = "base",
    columns = [],
    getAllRule = Table.DEFAULT_RULE,
    getOneRule = Table.DEFAULT_RULE,
    createRule = Table.DEFAULT_RULE,
    updateRule = Table.DEFAULT_RULE,
    deleteRule = Table.DEFAULT_RULE,
    options = {},
  }) {
    this.id = id;
    this.type = type;
    this.name = name;
    if (typeof columns === "string") {
      columns = JSON.parse(columns);
    }
    this.columns = columns.map((column) => new Column({ ...column }));
    this.getAllRule = getAllRule;
    this.getOneRule = getOneRule;
    this.createRule = createRule;
    this.deleteRule = deleteRule;
    this.updateRule = updateRule;

    if (typeof options === "string") {
      options = JSON.parse(options);
    }
    this.options = options;

    this.validate();
  }

  async validate() {
    if (!this.id) throw new Error("Table doesn't have a valid ID.");
    if (!this.name) throw new Error("The table must have a name.");
    if (this.type === "base") {
      if (this.columns.length === 0) {
        throw new Error("The table must have at least one column.");
      }
    }
    if (!this.columns.every((column) => column.id)) {
      throw new Error("Columns must have IDs.");
    }
    if (!this.columns.every((column) => column.name)) {
      throw new Error("All columns must have names.");
    }
    if (!this.columns.every((column) => column.type)) {
      throw new Error("All columns must have types.");
    }
    if (!this.columns.every((column) => Column.isValidType(column.type))) {
      throw new Error(
        `Invalid type passed: valid types are ${Object.keys(Column.COLUMN_MAP)}`
      );
    }

    if (
      this.columns.some(
        (column) =>
          column.name === "id" ||
          column.name === "created_at" ||
          column.name === "updated_at"
      )
    ) {
      throw new Error(
        "Cannot add a column with a name of id, created_at, or updated_at"
      );
    }

    let colNames = this.columns.map((column) => column.name);
    let setNames = new Set(colNames);
    if (colNames.length !== setNames.size) {
      throw new Error("All column names must be unique for a single table.");
    }

    Table.API_RULES.forEach((rule) => {
      if (!Table.API_RULE_VALUES.includes(this[rule])) {
        throw new Error(`Invalid ${rule}: ${this[rule]}`);
      }
    });

    for (let column of this.columns) {
      if (column.type !== "relation") continue;

      let relatedTable = await this.DAO.findTableById(
        column.getOptions().tableId
      );
      if (!relatedTable.length) {
        throw new Error("Table relation does not exist");
      }

      column.options.tableName = relatedTable[0].name;
    }
  }

  async tableNameAvailable() {
    const dao = new DAO(DB);
    const existingTable = await dao.tableExists(this.name);
    if (existingTable) {
      throw new Error("The table name already exists: ", this.name);
    }
  }

  async validateUpdateTo(newTable) {
    const dao = new DAO(DB);
    if (this.id !== newTable.id) {
      throw new Error("Table ID cannot be changed.");
    }

    if (this.name !== newTable.name) {
      await newTable.tableNameAvailable();
    }
    for (let column of newTable.columns) {
      let oldColumn = this.getColumnById(column.id);
      if (oldColumn === null) continue;
      if (oldColumn.type !== column.type) {
        throw new Error(
          `Column type cannot be changed: ${oldColumn.name} from ${oldColumn.type} to ${column.type}`
        );
      }
    }
    for (let column of newTable.getColumns()) {
      if (column.type !== "relation") {
        continue;
      }

      let oldColumn = this.getColumnById(column.id);
      if (oldColumn !== null) {
        if (oldColumn.getOptions().tableId !== column.getOptions().tableId) {
          throw new Error("Table relation cannot be changed");
        }
      }

      let relatedTable = await this.DAO.findTableById(
        column.getOptions().tableId
      );
      if (!relatedTable.length) {
        throw new Error("Table relation does not exist");
      }

      column.options.tableName = relatedTable[0].name;
    }
  }

  getColumns() {
    return this.columns;
  }

  stringifyColumns() {
    return JSON.stringify(this.getColumns());
  }

  stringifyOptions() {
    return JSON.stringify(this.options);
  }

  getColumnById(id) {
    let foundColumn = this.columns.find((column) => column.id === id);
    if (!foundColumn) return null;
    return foundColumn;
  }

  getColumnByName(name) {
    let foundColumn = this.columns.find((column) => column.name === name);
    if (!foundColumn) return null;
    return foundColumn;
  }

  hasColumn(name) {
    return this.columns.some((column) => column.name === name);
  }

  initializeIds() {
    this.columns.forEach((column) => column.initializeId());
  }

  async create() {
    const dao = new DAO(DB);
    await this.tableNameAvailable();
    await dao.createTable(this);
  }

  async drop() {
    const dao = new DAO(DB);
    await dao.dropTable(this.name);
  }

  async updateTo(updatedTable) {
    const dao = new DAO(DB);
    await this.validateUpdateTo(updatedTable);

    const columns = this.columns;
    const updatedColumns = updatedTable.columns;

    for (let column of columns) {
      if (
        updatedColumns.find((updatedColumn) => column.id === updatedColumn.id)
      )
        continue;
      await dao.dropColumn(this.name, column.name);
    }

    for (let updatedColumn of updatedColumns) {
      let match = columns.find((column) => column.id === updatedColumn.id);
      if (!match) {
        await dao.addColumn(this.name, updatedColumn);
      }
      if (match && match.name !== updatedColumn.name) {
        await dao.renameColumn(this.name, match.name, updatedColumn.name);
      }
    }

    if (this.name !== updatedTable.name) {
      await dao.renameTable(this.name, updatedTable.name);
    }
  }
}

export default Table;
