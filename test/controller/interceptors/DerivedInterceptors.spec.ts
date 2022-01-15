import {
	BaseController,
	BaseInterceptor,
	AuthInterceptor,
	ValidationInterceptor
} from "src/controller";

import { STATUS, ERROR_MESSAGES } from "src/controller/StatusCodes";

jest.mock("src/controller/StatusCodes", () => ({
	STATUS: class MockSTATUS {
		static BAD_REQUEST = 400;
		static UNAUTHORIZED = 401;
	},
	ERROR_MESSAGES: class ERROR_MESSAGES {
		static BAD_REQUEST = "Invalid arguments";
		static UNAUTHORIZED = "Unauthorized";
	}
}));

describe("Derived Interceptors: ", () => {
	[
		{
			ctx: "AuthInterceptor: ",
			SubClass: AuthInterceptor,
			controllerProtocol: "authProtocol",
			failureStatus: STATUS.UNAUTHORIZED,
			failureMessage: ERROR_MESSAGES.UNAUTHORIZED
		},
		{
			ctx: "ValidationInterceptor: ",
			SubClass: ValidationInterceptor,
			controllerProtocol: "validationProtocol",
			failureStatus: STATUS.BAD_REQUEST,
			failureMessage: ERROR_MESSAGES.BAD_REQUEST
		}
	].forEach(({ ctx, SubClass, controllerProtocol, failureStatus, failureMessage }) => {
		describe(ctx, () => {
			let uut: any;
			const mockProtocol = jest.fn();
			const MockController = {
				[controllerProtocol]: mockProtocol
			} as unknown as BaseController;
			beforeEach(() => {
				uut = new SubClass(MockController);
			});

			it("should be defined", () => {
				expect(uut).toBeDefined();
				expect(uut).toBeInstanceOf(SubClass);
			});
			it("should extend 'BaseInterceptor'", () => {
				expect(uut).toBeInstanceOf(BaseInterceptor);
			});

			it("should have correct properties", () => {
				expect(uut.protocol).toBe(mockProtocol);
				expect(uut.failureStatus).toBe(failureStatus);
				expect(uut.failureMessage).toBe(failureMessage);
			});
		});
	});
});
