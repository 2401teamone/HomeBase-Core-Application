import Table from "./mock/table_mock";
import knex from "knex";

const DB = knex({
  client: "better-sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: "test/test_data/test.db",
  },
});

beforeAll(async () => {
  await DB.schema.dropTableIfExists("cars");
  await DB.schema.dropTableIfExists("updated_cars");
});

afterAll(async () => {
  await DB.schema.dropTableIfExists("cars");
  await DB.schema.dropTableIfExists("updated_cars");
});

describe("Table Model Methods", () => {
  const cars = new Table({
    name: "cars",
    columns: [{ name: "brand", type: "text" }],
  });

  test("Create Table", async () => {
    await cars.create();
    expect(await DB.schema.hasTable("cars")).toBeTruthy();
  });

  test("Drop Table", async () => {
    await cars.drop();
    expect(await DB.schema.hasTable("cars")).toBeFalsy();
  });

  test("Update Table", async () => {
    await cars.create();
    const updated_cars = new Table({
      name: "updated_cars",
      columns: [{ name: "model", type: "number" }],
    });
    updated_cars.id = cars.id;
    await cars.updateTo(updated_cars);
    expect(await DB.schema.hasTable("updated_cars")).toBeTruthy();
  });
});
