import { BaseEntity } from "typeorm";
import { BaseIntellionEntity } from "src/entities/BaseIntellionEntity";
import { ConnectionManagerController } from "src/server/ConnectionManagerController";

jest.mock("../../src/server/ConnectionManagerController.ts");

describe.only("BaseIntellionEntity", () => {
	let uut: BaseIntellionEntity;
	let mockDefaultConnection: jest.Mock, mockUseConnection: jest.Mock;
	beforeEach(() => {
		mockDefaultConnection = jest.fn();
		Object.assign(ConnectionManagerController, {
			connectionManager: {
				default: mockDefaultConnection
			}
		});
		mockUseConnection = jest.fn();
		BaseEntity.useConnection = mockUseConnection;
		uut = new BaseIntellionEntity();
	});

	describe("class constructor", () => {
		it("should be defined", () => {
			expect(uut).toBeDefined();
		});
		it("should have correct properties", () => {
			expect(uut.connection).toBe(mockDefaultConnection);
		});

		it("should use the correct connection instance", () => {
			expect(mockUseConnection).toHaveBeenCalledWith(mockDefaultConnection);
		});
	});
});
