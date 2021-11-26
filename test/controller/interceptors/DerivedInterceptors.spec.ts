import {
	BaseInterceptor,
	AuthInterceptor,
	ValidationInterceptor
} from "src/controller/interceptors";
import { BaseController } from "src/controller";

describe("Derived Interceptors: ", () => {
	[
		{
			ctx: "AuthInterceptor: ",
			SubClass: AuthInterceptor,
			controllerProtocol: "authProtocol",
			failureStatus: 401,
			failureMessage: "Unauthorized"
		},
		{
			ctx: "ValidationInterceptor: ",
			SubClass: ValidationInterceptor,
			controllerProtocol: "validationProtocol",
			failureStatus: 400,
			failureMessage: "Invalid arguments"
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
			it("should extend 'Interceptor'", () => {
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
