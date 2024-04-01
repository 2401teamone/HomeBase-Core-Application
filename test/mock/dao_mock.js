import Column from "../../src/models/column.js";

class DAO {
  constructor(connection) {
    this.db = connection;
  }

  async disconnect() {
    await this.getDB().destroy();
  }

  getDB() {
    return this.db;
  }

  async tableExists(tableName) {
    const exists = await this.getDB().schema.hasTable(tableName);
    return exists;
  }

  async search(tableName, fields) {
    const rows = await this.getDB()(tableName).select("*").where(fields);
    return rows;
  }

  async checkUnique(tableName, fields, rowId) {
    const check = this.getDB()(tableName).count("id").where(fields);
    if (rowId) {
      check.whereNot({ id: rowId });
    }
    const [count] = await check;
    return Object.values(count)[0] === 0;
  }

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
        throw new Error("orderBy column does not exist");
      }
      throw new Error(e.message);
    }
  }

  async getOne(tableName, rowId) {
    const row = await this.getDB()(tableName).select("*").where({ id: rowId });
    return row;
  }

  async createOne(tableName, newRow) {
    try {
      const createdRow = await this.getDB()(tableName)
        .returning("*")
        .insert(newRow);
      return createdRow;
    } catch (e) {
      console.log(e);
      if (e.message.slice(0, 11) === "insert into") {
        throw new Error();
      } else {
        throw new Error(e.message);
      }
    }
  }

  async updateOne(tableName, rowId, newRow) {
    const updatedRow = await this.getDB()(tableName)
      .returning("*")
      .where({ id: rowId })
      .update(newRow);
    return updatedRow;
  }

  async deleteOne(tableName, rowId) {
    await this.getDB()(tableName).where({ id: rowId }).del();
  }

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

  async dropTable(tableName) {
    await this.getDB().schema.dropTable(tableName);
  }

  async renameTable(tableName, newName) {
    await this.getDB().schema.renameTable(tableName, newName);
  }

  async addColumn(tableName, column) {
    await this.getDB().schema.table(tableName, (table) => {
      this._addColumnPerSpecs(column, table);
    });
  }

  async renameColumn(tableName, name, newName) {
    await this.getDB().schema.table(tableName, (table) => {
      table.renameColumn(name, newName);
    });
  }

  async dropColumn(tableName, columnName) {
    await this.getDB().schema.table(tableName, (table) => {
      table.dropColumn(columnName);
    });
  }

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
