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
	const derivedInterceptorTestCases = [
		{
			definition: "AuthInterceptor: ",
			Interceptor: AuthInterceptor,
			controllerProtocol: "authProtocol",
			failureStatus: STATUS.UNAUTHORIZED,
			error: undefined,
			failureResponse: ERROR_MESSAGES.UNAUTHORIZED
		},
		{
			definition: "ValidationInterceptor: ",
			Interceptor: ValidationInterceptor,
			controllerProtocol: "validationProtocol",
			failureStatus: STATUS.BAD_REQUEST,
			error: { message: "custom-bad-request-error-message" },
			failureResponse: ERROR_MESSAGES.BAD_REQUEST
		}
	];

	describe.each(derivedInterceptorTestCases)(
		"$definition: ",
		({ Interceptor, controllerProtocol, error, failureStatus, failureResponse }) => {
			let uut: any;
			const mockProtocol = jest.fn();
			const MockController = {
				[controllerProtocol]: mockProtocol
			} as unknown as BaseController;

			beforeEach(() => {
				uut = new Interceptor(MockController);
			});

			it("should be defined", () => {
				expect(uut).toBeDefined();
				expect(uut).toBeInstanceOf(Interceptor);
			});

			it("should extend 'BaseInterceptor'", () => {
				expect(uut).toBeInstanceOf(BaseInterceptor);
			});

			it("should have correct 'protocol' and 'failureStatus'", () => {
				expect(uut.protocol).toBe(mockProtocol);
				expect(uut.failureStatus).toBe(failureStatus);
			});

			describe("when no custom error functionality is available, or no error is provided", () => {
				it("should respond with default failure message", () => {
					expect(uut.failureMessage()).toBe(failureResponse);
				});
			});

			if (error !== undefined)
				describe("when a custom error is provided", () => {
					beforeEach(() => {
						Object.assign(uut, { error });
					});

					it("should respond with provided error message", () => {
						expect(uut.failureMessage()).toBe(error.message);
					});
				});
		}
	);
});
