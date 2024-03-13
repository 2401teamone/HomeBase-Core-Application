
    import DAO from "../src/dao/dao.js";

    export async function up(knex) {
      const oldTable = {"id":"8657b606-1666-4dcb-b8c1-a9e6077283b3","name":"Octopus","columns":[{"id":"d69eba78-b88c-4e19-992f-4d16589908dd","name":"name","type":"text","options":{"minLength":0,"maxLength":255}}],"getAllRule":"admin","getOneRule":"public","createRule":"public","deleteRule":"public","updateRule":"public"};
      const newTable = {"id":"8657b606-1666-4dcb-b8c1-a9e6077283b3","name":"Octopus","columns":[{"id":"d69eba78-b88c-4e19-992f-4d16589908dd","name":"name","type":"text","options":{"minLength":5,"maxLength":255}}],"getAllRule":"admin","getOneRule":"public","createRule":"public","deleteRule":"public","updateRule":"public"};
      const oldColumns = [{"id":"d69eba78-b88c-4e19-992f-4d16589908dd","name":"name","type":"text","options":{"minLength":0,"maxLength":255}}];
      const newColumns = [{"id":"d69eba78-b88c-4e19-992f-4d16589908dd","name":"name","type":"text","options":{"minLength":5,"maxLength":255}}];

      const dao = new DAO("", knex);

      // Delete Columns (Tested)
      for (let oldColumn of oldColumns) {
        if (newColumns.find((newColumn) => oldColumn.id === newColumn.id)) continue;
        await dao.dropColumn(oldTable.name, oldColumn.name);
      }

      // Add OR Rename Columns (Renaming Tested, Adding tested)
      for (let newColumn of newColumns) {
        let match = oldColumns.find((oldColumn) => oldColumn.id === newColumn.id);
        if (!match) {
          await dao.addColumn(oldTable.name, newColumn);
        }
        if (match && match.name !== newColumn.name) {
          await dao.renameColumn(oldTable.name, match.name, newColumn.name);
        }
      }

      // Rename Table (Tested)
      if (oldTable.name !== newTable.name) {
        await dao.renameTable(oldTable.name, newTable.name);
      }

      // sets the table meta to the new table
      await dao.updateTableMetaData({"id":"8657b606-1666-4dcb-b8c1-a9e6077283b3","name":"Octopus","columns":"[{\"id\":\"d69eba78-b88c-4e19-992f-4d16589908dd\",\"name\":\"name\",\"type\":\"text\",\"options\":{\"minLength\":5,\"maxLength\":255}}]","getAllRule":"admin","getOneRule":"public","createRule":"public","deleteRule":"public","updateRule":"public"})
    }

    export async function down(knex) {
      //Run the exact same logic as the up method, but with new and old variables
      //swapped..
      const oldTable = {"id":"8657b606-1666-4dcb-b8c1-a9e6077283b3","name":"Octopus","columns":[{"id":"d69eba78-b88c-4e19-992f-4d16589908dd","name":"name","type":"text","options":{"minLength":5,"maxLength":255}}],"getAllRule":"admin","getOneRule":"public","createRule":"public","deleteRule":"public","updateRule":"public"};
      const newTable = {"id":"8657b606-1666-4dcb-b8c1-a9e6077283b3","name":"Octopus","columns":[{"id":"d69eba78-b88c-4e19-992f-4d16589908dd","name":"name","type":"text","options":{"minLength":0,"maxLength":255}}],"getAllRule":"admin","getOneRule":"public","createRule":"public","deleteRule":"public","updateRule":"public"};
      const oldColumns = [{"id":"d69eba78-b88c-4e19-992f-4d16589908dd","name":"name","type":"text","options":{"minLength":5,"maxLength":255}}];
      const newColumns = [{"id":"d69eba78-b88c-4e19-992f-4d16589908dd","name":"name","type":"text","options":{"minLength":0,"maxLength":255}}];

      const dao = new DAO("", knex);

      // Delete Columns
      for (let oldColumn of oldColumns) {
        if (newColumns.find((newColumn) => oldColumn.id === newColumn.id)) continue;
        await dao.dropColumn(oldTable.name, oldColumn.name);
      }

      // Add OR Rename Columns
      for (let newColumn of newColumns) {
        let match = oldColumns.find((oldColumn) => oldColumn.id === newColumn.id);
        if (!match) {
          await dao.addColumn(oldTable.name, newColumn);
        }
        if (match && match.name !== newColumn.name) {
          await dao.renameColumn(oldTable.name, match.name, newColumn.name);
        }
      }

      if (oldTable.name !== newTable.name) {
        await dao.renameTable(oldTable.name, newTable.name);
      }

      // sets the table meta to the old table
      await dao.updateTableMetaData({"id":"8657b606-1666-4dcb-b8c1-a9e6077283b3","name":"Octopus","columns":"[{\"id\":\"d69eba78-b88c-4e19-992f-4d16589908dd\",\"name\":\"name\",\"type\":\"text\",\"options\":{\"minLength\":0,\"maxLength\":255}}]","getAllRule":"admin","getOneRule":"public","createRule":"public","deleteRule":"public","updateRule":"public"})
    }
   