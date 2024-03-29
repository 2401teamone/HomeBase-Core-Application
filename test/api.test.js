import axios from "axios";
import initApi from "../src/api/init_api";

jest.mock("axios");

beforeAll(() => {
  const api = initApi({});
});

describe("Schema Routes", () => {
  test("Get All Tables", async () => {
    const mockData = [
      {
        name: "mocked_table",
        columns: [{ name: "mocked_column", type: "text" }],
      },
    ];
    await axios.get.mockResolvedValue(mockData);
    const data = await axios.get("http://localhost:3000/api/schema");
    expect(data).toEqual(mockData);
  });

  test("Create Table", async () => {
    const mockData = [
      {
        name: "mocked_table",
        columns: [{ name: "mocked_column", type: "text" }],
      },
    ];
  });
});
