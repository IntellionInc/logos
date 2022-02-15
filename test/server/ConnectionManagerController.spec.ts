import { ConnectionManagerController } from "src/server";

describe("ConnectionManagerController: ", () => {
	const uut = ConnectionManagerController;
	it("should have a connectionManager property", () => {
		expect(uut).toHaveProperty("connectionManager");
		expect(uut.connectionManager).toBeNull();
	});
});
