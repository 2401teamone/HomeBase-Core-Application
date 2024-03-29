import DAO from "../src/dao/dao";
import knex from "knex";

const db = knex({
  client: "better-sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: "test/test.db",
  },
});

const DAOtest = new DAO(db);

beforeAll(async () => {
  await db.schema.dropTableIfExists("test");
  await db.schema.dropTableIfExists("updated_test");
  await db.schema.dropTableIfExists("people");
  await DAOtest.createTable({
    name: "people",
    columns: [{ name: "name", type: "text" }],
  });
});

afterAll(async () => {
  await db.schema.dropTableIfExists("test");
  await db.schema.dropTableIfExists("updated_test");
  await db.schema.dropTableIfExists("people");
  await DAOtest.disconnect();
});

describe("Schema Table Methods", () => {
  test("Create Table", async () => {
    await DAOtest.createTable({
      name: "test",
      columns: [{ name: "name", type: "text" }],
    });
    expect(await db.schema.hasTable("test")).toBeTruthy();
  });

  test("Rename Table", async () => {
    await DAOtest.renameTable("test", "updated_test");
    expect(await db.schema.hasTable("updated_test")).toBeTruthy();
  });

  test("Delete Table", async () => {
    await DAOtest.dropTable("updated_test");
    expect(await db.schema.hasTable("updated_test")).toBeFalsy();
  });
});

describe("Schema Column Methods", () => {
  test("Add Column", async () => {
    await DAOtest.addColumn("people", { name: "age", type: "number" });
    expect(await db.schema.hasColumn("people", "age")).toBeTruthy();
  });

  test("Rename Column", async () => {
    await DAOtest.renameColumn("people", "age", "height");
    expect(await db.schema.hasColumn("people", "height")).toBeTruthy();
  });

  test("Delete Column", async () => {
    await DAOtest.dropColumn("people", "height");
    expect(await db.schema.hasColumn("people", "height")).toBeFalsy();
  });
});

describe("CRUD Methods", () => {
  test("Add Row", async () => {
    await DAOtest.createOne("people", { name: "Alan" });
    expect(await db.select("name").from("people")).toEqual([{ name: "Alan" }]);
  });

  test("Get Row", async () => {
    const row = await db.select("id").from("people");
    const DAOrow = await DAOtest.getOne("people", row[0].id);
    expect(DAOrow[0].id).toEqual(row[0].id);
  });

  test("Update Row", async () => {
    const row = await db.select("id").from("people");
    await DAOtest.updateOne("people", row[0].id, { name: "Not_Alan" });
    expect(await db.select("name").from("people")).toEqual([
      { name: "Not_Alan" },
    ]);
  });

  test("Delete Row", async () => {
    const row = await db.select("id").from("people");
    await DAOtest.deleteOne("people", row[0].id);
    expect(await db.select("name").from("people")).toHaveLength(0);
  });
});
