import DAO from "../src/dao/dao";
import knex from "knex";

const DB = knex({
  client: "better-sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: "test/test_data/test.db",
  },
});

const dao = new DAO(DB);

beforeAll(async () => {
  await DB.schema.dropTableIfExists("test");
  await DB.schema.dropTableIfExists("updated_test");
  await DB.schema.dropTableIfExists("people");
  await dao.createTable({
    name: "people",
    columns: [{ name: "name", type: "text" }],
  });
});

afterAll(async () => {
  await DB.schema.dropTableIfExists("test");
  await DB.schema.dropTableIfExists("updated_test");
  await DB.schema.dropTableIfExists("people");
  await dao.disconnect();
});

describe("Schema Table Methods", () => {
  test("Create Table", async () => {
    await dao.createTable({
      name: "test",
      columns: [{ name: "name", type: "text" }],
    });
    expect(await DB.schema.hasTable("test")).toBeTruthy();
  });

  test("Rename Table", async () => {
    await dao.renameTable("test", "updated_test");
    expect(await DB.schema.hasTable("updated_test")).toBeTruthy();
  });

  test("Delete Table", async () => {
    await dao.dropTable("updated_test");
    expect(await DB.schema.hasTable("updated_test")).toBeFalsy();
  });
});

describe("Schema Column Methods", () => {
  test("Add Column", async () => {
    await dao.addColumn("people", { name: "age", type: "number" });
    expect(await DB.schema.hasColumn("people", "age")).toBeTruthy();
  });

  test("Rename Column", async () => {
    await dao.renameColumn("people", "age", "height");
    expect(await DB.schema.hasColumn("people", "height")).toBeTruthy();
  });

  test("Delete Column", async () => {
    await dao.dropColumn("people", "height");
    expect(await DB.schema.hasColumn("people", "height")).toBeFalsy();
  });
});

describe("CRUD Methods", () => {
  test("Add Row", async () => {
    await dao.createOne("people", { name: "Alan" });
    expect(await DB.select("name").from("people")).toEqual([{ name: "Alan" }]);
  });

  test("Get Row", async () => {
    const row = await DB.select("id").from("people");
    const DAOrow = await dao.getOne("people", row[0].id);
    expect(DAOrow[0].id).toEqual(row[0].id);
  });

  test("Update Row", async () => {
    const row = await DB.select("id").from("people");
    await dao.updateOne("people", row[0].id, { name: "Not_Alan" });
    expect(await DB.select("name").from("people")).toEqual([
      { name: "Not_Alan" },
    ]);
  });

  test("Delete Row", async () => {
    const row = await DB.select("id").from("people");
    await dao.deleteOne("people", row[0].id);
    expect(await DB.select("name").from("people")).toHaveLength(0);
  });
});
