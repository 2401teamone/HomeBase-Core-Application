import Column from "../models/column.js";

import { systemFields } from "./constants.js";

export default function parseJsonColumns(table, rows) {
  console.log(rows, table, "ROWS");
  for (let row of rows) {
    for (let key in row) {
      if (
        systemFields
          .filter((field) => {
            if (field.type === "base") return true;
            if (field.type === "auth" && table.type === "auth") return true;
          })
          .map((field) => field.field)
          .includes(key)
      ) {
        continue;
      }

      const column = table.getColumnByName(key);
      console.log(column, key, "COLUMN", "made it here");
      const columnType = column?.type;
      const isStringifiedJson = Column.COLUMN_MAP[columnType].isJson;
      if (isStringifiedJson) {
        try {
          row[key] = JSON.parse(row[key]);
        } catch (err) {
          continue;
        }
      }
    }
  }
}
