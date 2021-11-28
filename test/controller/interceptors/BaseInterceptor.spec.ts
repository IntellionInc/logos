import { Chain } from "@intellion/arche";
import { BaseController, BaseInterceptor } from "src/controller";

jest.mock("@intellion/arche", () => ({
	Chain: class MockChain {
		main = jest.fn().mockReturnThis();
		finally = jest.fn().mockReturnThis();
	}
}));

class MockInterceptor extends BaseInterceptor {
	failureStatus = 5555;
	failureMessage = "some-failure-message";
}

describe("BaseInterceptor: ", () => {
	let uut: MockInterceptor;

	const [mockMain, mockFinally] = [1, 2].map(() => jest.fn());

	const MockController = {
		main: mockMain,
		finally: mockFinally,
		status: 4242,
		_interception: null
	} as unknown as BaseController;

	describe("class constructor", () => {
		beforeEach(() => {
			uut = new MockInterceptor(MockController);
		});
		it("should be defined", () => {
			expect(uut).toBeDefined();
		});
		it("should extend 'Chain'", () => {
			expect(uut).toBeInstanceOf(Chain);
		});
		it("should have a controller and correct hooks", () => {
			expect(uut).toHaveProperty("controller");
			expect(uut.controller).toBe(MockController);

			expect(uut.main).toHaveBeenCalledWith(uut.runProtocol);
			expect(uut.finally).toHaveBeenNthCalledWith(1, uut.setControllerStatus);
			expect(uut.finally).toHaveBeenNthCalledWith(2, uut.setControllerInterception);
			expect(uut.finally).toHaveBeenNthCalledWith(3, uut.setYield);
		});
	});

	describe("class methods", () => {
		describe("runProtocol", () => {
			let mockProtocol: jest.Mock;
			beforeEach(() => {
				mockProtocol = jest.fn();
				uut.protocol = mockProtocol;
			});
			it("should execute correct controller protocol", async () => {
				await uut.runProtocol();
				expect(mockProtocol).toHaveBeenCalled();
			});
		});
		describe("setControllerStatus", () => {
			describe("for a successful protocol execution", () => {
				beforeEach(() => {
					uut.success = true;
				});
				it("should do nothing", async () => {
					await uut.setControllerStatus();
				});
			});
			describe("for an unsuccessful protocol execution", () => {
				beforeEach(() => {
					uut.success = false;
				});
				it("should set controller status to failureStatus", async () => {
					await uut.setControllerStatus();
					expect(uut.controller.status).toEqual(uut.failureStatus);
				});
			});
		});
		describe("setControllerInterception", () => {
			describe("for a successful protocol execution", () => {
				beforeEach(() => {
					uut.success = true;
				});
				it("should do nothing", async () => {
					await uut.setControllerInterception();
					expect(uut.controller._interception).toBeNull();
				});
			});
			describe("for an unsuccessful protocol execution", () => {
				beforeEach(() => {
					uut.success = false;
				});
				it("should set controller interception to failureMessage", async () => {
					await uut.setControllerInterception();
					expect(uut.controller._interception).toBe("some-failure-message");
				});
			});
		});

		describe("setYield", () => {
			[true, false].forEach(successCase => {
				describe(`for ${
					successCase ? "a succecssful" : "an unsuccessful"
				} protocol execution`, () => {
					beforeEach(() => {
						uut.success = successCase;
					});
					it("should set controller yield to success status", () => {
						uut.setYield();
						expect(uut.yield).toEqual({ success: successCase });
					});
				});
			});
		});
	});
});
