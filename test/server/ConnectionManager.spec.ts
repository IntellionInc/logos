import { DataSource } from "typeorm";
import { ConnectionManager } from "src/server/ConnectionManager";
import { IConnection } from "src/types";

jest.mock("typeorm");

describe("ConnectionManager", () => {
	let uut: ConnectionManager;
	const connectionName = "some-connection";
	const dbConfig = { some: "config" } as unknown as IConnection;

	beforeEach(() => {
		uut = new ConnectionManager();
	});

	it("should be defined", () => {
		expect(uut).toBeDefined();
		expect(uut).toHaveProperty("connectionDictionary", {});
	});

	it("should create a new DataSource and store the connection", async () => {
		const connection = uut.create(connectionName, dbConfig);

		expect(DataSource).toHaveBeenCalledWith({ name: connectionName, ...dbConfig });
		expect(connection).toBeInstanceOf(DataSource);

		expect(uut).toHaveProperty("connectionDictionary", { [connectionName]: connection });
	});

	it("should retrieve an existing DataSource", async () => {
		const createdConnection = uut.create(connectionName, dbConfig);
		const connection = uut.get(connectionName);

		expect(connection).toBe(createdConnection);
	});
});
