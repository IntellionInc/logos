import { BaseEntity } from "typeorm";
import { BaseIntellionEntity } from "src/entities";
import { ConnectionManagerController } from "src/server";

jest.mock("../../src/server/ConnectionManagerController.ts");

describe("BaseIntellionEntity", () => {
	let uut: BaseIntellionEntity;
	let mockConnectionManagerGet: jest.Mock,
		mockDefaultConnection: jest.Mock,
		mockUseDataSource: jest.Mock;
	beforeEach(() => {
		mockDefaultConnection = jest.fn();
		mockConnectionManagerGet = jest.fn().mockReturnValue(mockDefaultConnection);
		Object.assign(ConnectionManagerController, {
			connectionManager: {
				get: mockConnectionManagerGet
			}
		});
		mockUseDataSource = jest.fn();
		BaseEntity.useDataSource = mockUseDataSource;
		uut = new BaseIntellionEntity();
	});

	describe("class constructor", () => {
		it("should be defined", () => {
			expect(uut).toBeDefined();
		});

		it("should have the default connection name", () => {
			expect(uut.connectionName).toBe("default");
		});

		it("should call the connection manager to get the default connection", () => {
			expect(mockConnectionManagerGet).toHaveBeenCalledWith(uut.connectionName);
		});

		it("should have correct properties", () => {
			expect(uut.connection).toBe(mockDefaultConnection);
		});

		it("should use the correct connection instance", () => {
			expect(mockUseDataSource).toHaveBeenCalledWith(mockDefaultConnection);
		});
	});
});
