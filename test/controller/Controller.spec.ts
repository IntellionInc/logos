import { Request, Response } from "express";
import { Chain } from "@intellion/arche";
import { BaseController } from "src/controller/Controller";
import { BaseInterceptor } from "src/controller/interceptors/BaseInterceptor";
import {
	AuthInterceptor,
	ValidationInterceptor
} from "src/controller/interceptors/DerivedInterceptors";
import { BaseSerializer } from "src/controller/serializers/BaseSerializer";
import { STATUS } from "src/controller/StatusCodes";

jest.mock("src/controller/interceptors/BaseInterceptor");
jest.mock("src/controller/interceptors/DerivedInterceptors");
jest.mock("src/controller/serializers/BaseSerializer");

class MockController extends BaseController {}

let mockChainErrorHandler: jest.Mock;
jest.mock("@intellion/arche", () => ({
	Chain: class MockChain {
		async errorHandler(error: Error) {
			await mockChainErrorHandler(error);
		}
		initially = jest.fn().mockReturnThis();
		main = jest.fn().mockReturnThis();
		finally = jest.fn().mockReturnThis();
	}
}));

describe("Controller: ", () => {
	let request: Request, response: Response;
	let uut: MockController;

	describe("class constructor", () => {
		let instance: BaseController;
		beforeEach(() => {
			request = {} as Request;
			response = {} as Response;

			mockChainErrorHandler = jest.fn();
			instance = new MockController(request, response);
		});

		it("should be defined", () => {
			expect(instance).toBeDefined();
		});

		it("should extend 'Chain'", () => {
			expect(instance).toBeInstanceOf(Chain);
		});

		it("should have correct hooks and properties", () => {
			const properties: Record<string, any> = {
				request: {},
				response: {},
				interceptors: [],
				Serializer: BaseSerializer,
				status: STATUS.SUCCESS
			};

			Object.keys(properties).forEach(key => {
				expect(instance).toHaveProperty(key);
				expect(instance[key as keyof MockController]).toEqual(properties[key]);
			});

			const { _control, _setStatus, _setResponseData, _respond } = instance;
			expect(instance.main).toHaveBeenCalledWith(_control);
			expect(instance.finally).toHaveBeenNthCalledWith(1, _setStatus);
			expect(instance.finally).toHaveBeenNthCalledWith(2, _setResponseData);
			expect(instance.finally).toHaveBeenNthCalledWith(3, _respond);
		});

		it("should have the correct static properties", () => {
			const properties: Record<string, any> = {
				MIDDLEWARES: []
			};

			Object.keys(properties).forEach(key => {
				expect(BaseController).toHaveProperty(key);
				expect(BaseController[key as keyof MockController]).toEqual(properties[key]);
			});
		});
	});

	beforeEach(() => {
		request = {} as Request;
		response = {} as Response;
		uut = new MockController(request, response);
	});

	describe("syntactic sugar", () => {
		const selfCases = [{ property: "one" }, { property: "and" }];

		describe.each(selfCases)("$property", ({ property }) => {
			it("should be equal to the class instance itself", () => {
				expect(uut[property]).toBe(uut);
			});
		});
	});

	describe("essential controller operations", () => {
		describe("_setInterceptors", () => {
			let mockBefore: jest.Mock;
			let interceptors: BaseInterceptor[];

			beforeEach(() => {
				mockBefore = jest.fn();

				uut.before = mockBefore;
			});

			describe("when there are no interceptors", () => {
				interceptors = [];

				beforeEach(() => {
					uut.interceptors = interceptors;
				});

				it("should not add any interceptors to 'before' hooks", () => {
					uut._setInterceptors();
					expect(mockBefore).not.toHaveBeenCalled();
				});
			});

			describe("when some interceptors are provided", () => {
				const [i1, i2, i3] = [
					{ exec: null },
					{ exec: null },
					{ exec: null }
				] as BaseInterceptor[];

				beforeEach(() => {
					[i1, i2, i3].forEach(interceptor => (interceptor.exec = jest.fn()));

					uut.interceptors = [i1, i2, i3];
				});

				it("should add execution function of each interceptor as a 'before' hook", () => {
					expect.assertions(3);

					uut._setInterceptors();

					uut.interceptors.forEach(({ exec }, i) =>
						expect(mockBefore).toHaveBeenNthCalledWith(i + 1, exec)
					);
				});
			});
		});

		describe("_control", () => {
			let mockControlledFunction: jest.Mock;

			const mockControlledResult = { some: "controlled-result" };

			beforeEach(() => {
				mockControlledFunction = jest.fn().mockResolvedValueOnce(mockControlledResult);
				uut._controlledFunction = mockControlledFunction;
			});

			it("should call the controller function, set '_controlledResult' and return the class instance iteslf", async () => {
				const result = await uut._control();
				expect(result).toBe(mockControlledResult);
				expect(mockControlledFunction).toHaveBeenCalledWith(request);
				expect(uut._controlledResult).toBe(mockControlledResult);
			});
		});

		describe("_setStatus", () => {
			let mockStatus: jest.Mock;
			const status = 4242;

			beforeEach(() => {
				mockStatus = jest.fn();

				uut.status = status;
				Object.assign(response, { status: mockStatus });
			});

			it("should set the response status appropriately", async () => {
				await uut._setStatus();
				expect(mockStatus).toHaveBeenCalledWith(status);
			});
		});

		describe("_setResponseData", () => {
			const [mockInterception, mockSerializedResult, mockControlledResult] = [
				"interception",
				{ some: "serialized-result" },
				{ some: "controlled-result" }
			];

			const mockInterceptionResponse = {
				data: null,
				count: undefined,
				paginated: undefined,
				error: mockInterception
			};

			describe("when there is an interception", () => {
				beforeEach(() => {
					Object.assign(uut, {
						_interception: mockInterception,
						_serializedResult: mockSerializedResult,
						_controlledResult: mockControlledResult
					});
				});

				it("should set 'responseData' as interception data regardless of other fields", () => {
					uut._setResponseData();
					expect(uut.responseData).toEqual(mockInterceptionResponse);
				});
			});

			describe("when there is no interception and there is a serialized result", () => {
				beforeEach(() => {
					Object.assign(uut, {
						_interception: null,
						_serializedResult: mockSerializedResult,
						_controlledResult: mockControlledResult
					});
				});

				it("should set 'responseData' as serialized data regardless of the controlled result", () => {
					uut._setResponseData();
					expect(uut.responseData).toBe(mockSerializedResult);
				});
			});

			describe("when there is no interception or serialization", () => {
				beforeEach(() => {
					Object.assign(uut, {
						_interception: null,
						_serializedResult: null,
						_controlledResult: mockControlledResult
					});
				});

				it("should set 'responseData' as controlled result", () => {
					uut._setResponseData();
					expect(uut.responseData).toBe(mockControlledResult);
				});
			});
		});

		describe("_respond", () => {
			let mockResponseSend: jest.Mock;
			let mockResponseProtocol: jest.Mock;

			const mockResponse = { some: "response-data" };

			beforeEach(() => {
				mockResponseSend = jest.fn();
				mockResponseProtocol = jest.fn().mockResolvedValueOnce(mockResponse);

				uut.responseProtocol = mockResponseProtocol;
				Object.assign(response, { send: mockResponseSend });
			});

			it("should call the response protocol and set up controller response accordingly", async () => {
				await uut._respond();
				expect(mockResponseProtocol).toHaveBeenCalled();
				expect(mockResponseSend).toHaveBeenCalledWith(mockResponse);
			});
		});
	});

	describe("additional operations and protocols", () => {
		describe("controller method assignment", () => {
			describe("controls", () => {
				let mockControlledFunction: jest.Mock;

				const methodName = "someMethod";

				beforeEach(() => {
					mockControlledFunction = jest.fn();
					Object.assign(uut, { [methodName]: mockControlledFunction });
				});

				it("should set '_controlledFunction' to desired method and return the class instance itself", () => {
					const result = uut.controls(methodName);
					expect(uut._controlledFunction).toBe(mockControlledFunction);
					expect(result).toBe(uut);
				});
			});
		});

		describe("authentication", () => {
			describe("authProtocol", () => {
				const defaultAuthProtocol = {
					success: true,
					data: "Default Auth Protocol",
					errors: []
				};

				it("should return successful with the pre-determined data by default", async () => {
					const result = await uut.authProtocol();

					expect(result).toEqual(defaultAuthProtocol);
				});
			});

			describe("authenticates", () => {
				let mockSetAuthentication: jest.Mock;

				beforeEach(() => {
					mockSetAuthentication = jest.fn();
					uut._setAuthentication = mockSetAuthentication;
				});

				it("should call '_setAuthentication' to setup the auth interceptors, and return the class instance itself", () => {
					const result = uut.authenticates();
					expect(mockSetAuthentication).toHaveBeenCalled();
					expect(result).toBe(uut);
				});
			});

			describe("_setAuthenticates", () => {
				let mockBefore: jest.Mock;
				let mockExec: jest.Mock;

				beforeEach(() => {
					mockBefore = jest.fn();
					mockExec = jest.fn();

					uut.before = mockBefore;
					Object.assign(AuthInterceptor.prototype, { exec: mockExec });
				});

				it("should insert an 'AuthInterceptor' as a 'before' hook and return the class instance itself", () => {
					const result = uut._setAuthentication();
					expect(AuthInterceptor).toHaveBeenCalledWith(uut);
					expect(mockBefore).toHaveBeenCalledWith(mockExec);
					expect(result).toBe(uut);
				});
			});
		});

		describe("serialization and response", () => {
			describe("responseProtocol", () => {
				const [meta, responseData] = [
					{ some: "meta" },
					{ data: { some: "response-data" }, error: null }
				];

				beforeEach(() => {
					Object.assign(uut, { meta, responseData });
				});

				describe("when the response status is success", () => {
					const status = 242;
					const successResponse = { status, meta, data: responseData.data, error: null };

					beforeEach(() => {
						Object.assign(uut, { status });
					});

					it("should send the proper response with 'status', 'meta' and 'data' fields", async () => {
						const result = await uut.responseProtocol();
						expect(result).toEqual(successResponse);
					});
				});

				describe("when the response status is failure", () => {
					let mockConsoleTrace: jest.Mock;
					let actualConsoleTrace: any;
					const status = 542;
					const failureResponse = { status, meta, error: null, data: null };
					const mockResponseError = {
						message: "some-response-error",
						stack: "some-response-error-stack"
					};

					beforeEach(() => {
						mockConsoleTrace = jest.fn();
						actualConsoleTrace = console.trace;
						console.trace = mockConsoleTrace;
						Object.assign(responseData, { data: null, error: mockResponseError });
						Object.assign(failureResponse, { error: mockResponseError });
						Object.assign(uut, { status, stack: mockConsoleTrace });
					});

					afterEach(() => {
						console.trace = actualConsoleTrace;
					});

					it("should attach 'error' and 'stack' fields to response message, with 'data' field set to 'null'", async () => {
						const result = await uut.responseProtocol();
						expect(result).toEqual(failureResponse);
					});
				});
			});

			describe("_serialize", () => {
				let mockSerialize: jest.Mock;
				const MockSerializer = {} as typeof BaseSerializer;

				beforeEach(() => {
					uut.Serializer = MockSerializer;
				});

				describe("when the serialization is successful", () => {
					const mockCount = 42;
					const mockPaginated = true;
					const mockSerializedData = { some: "serialized-data" };
					const mockSerializedResult = {
						data: mockSerializedData,
						count: mockCount,
						paginated: mockPaginated,
						success: true
					};

					beforeEach(() => {
						mockSerialize = jest.fn().mockResolvedValueOnce(mockSerializedData);
						uut.count = mockCount;
						uut.paginated = mockPaginated;
						BaseSerializer.serialize = mockSerialize;
					});

					describe("when the result is undefined", () => {
						beforeEach(() => {
							uut._controlledResult = undefined;
						});

						it("should pass undefined to serialize", async () => {
							await uut._serialize();
							expect(uut._serializedResult).toEqual(mockSerializedResult);
							expect(mockSerialize).toHaveBeenCalledWith(MockSerializer, undefined);
						});
					});

					describe("when the result has a data field", () => {
						const mockControlledResult = { data: { some: "data" }, success: true };

						beforeEach(() => {
							uut._controlledResult = mockControlledResult;
						});

						it("should serialize the data field of the result returned by controller method", async () => {
							await uut._serialize();
							expect(uut._serializedResult).toEqual(mockSerializedResult);
							expect(mockSerialize).toHaveBeenCalledWith(
								MockSerializer,
								mockControlledResult.data
							);
						});
					});

					describe("when the result doesn't have a data field", () => {
						const mockControlledResult = { data: { some: "data" }, success: true };

						beforeEach(() => {
							uut._controlledResult = mockControlledResult;
						});

						it("should serialize the result returned by controller method", async () => {
							await uut._serialize();
							expect(uut._serializedResult).toEqual(mockSerializedResult);
							expect(mockSerialize).toHaveBeenCalledWith(
								MockSerializer,
								mockControlledResult.data
							);
						});
					});
				});

				describe("when there is a serialization error", () => {
					const mockControlledResult = {
						data: { some: "controller-result" },
						success: false
					};

					const [errorMessage, errorStack] = [
						"serialization-error-message",
						"serialization-error-stack"
					];
					const serializationError = {
						message: errorMessage,
						stack: errorStack
					};
					const thrownSerialization = {
						data: null,
						success: false,
						error: errorMessage,
						stack: errorStack
					};

					beforeEach(() => {
						uut._controlledResult = mockControlledResult;

						mockSerialize = jest.fn().mockRejectedValueOnce(serializationError);
						BaseSerializer.serialize = mockSerialize;
					});

					it("should set the serialization result with error message and error stack", async () => {
						await uut._serialize();
						expect(uut._serializedResult).toEqual(thrownSerialization);
					});
				});
			});

			describe("_setSerialization", () => {
				let mockAfter: jest.Mock;
				let mockSerialize: jest.Mock;

				beforeEach(() => {
					mockAfter = jest.fn();
					mockSerialize = jest.fn();

					uut.after = mockAfter;
					uut._serialize = mockSerialize;
				});

				it("should insert '_serialize' method as an 'after' hook and return the class instance itself", () => {
					const result = uut._setSerialization();
					expect(mockAfter).toHaveBeenCalledWith(mockSerialize);
					expect(result).toBe(uut);
				});
			});

			describe("serializes", () => {
				let mockSetSerialization: jest.Mock;

				beforeEach(() => {
					mockSetSerialization = jest.fn();
					uut._setSerialization = mockSetSerialization;
				});

				it("should call '_setSerialization' to setup the serializers, and return the class instance itself", () => {
					const result = uut.serializes();
					expect(mockSetSerialization).toHaveBeenCalled();
					expect(result).toBe(uut);
				});
			});
		});

		describe("request validation", () => {
			describe("validationProtocol", () => {
				const defaultValidationData = "Default Validation Protocol";
				const defaultValidation = {
					success: true,
					data: defaultValidationData,
					errors: []
				};

				it("should return successful with the pre-determined data by default", async () => {
					const result = await uut.validationProtocol();
					expect(result).toEqual(defaultValidation);
				});
			});

			describe("_validate", () => {
				let mockValidationProtocol: jest.Mock;

				const mockValidation = { some: "validated-data" };

				beforeEach(() => {
					mockValidationProtocol = jest.fn().mockResolvedValueOnce(mockValidation);
					uut.validationProtocol = mockValidationProtocol;
				});

				it("should call the validation protocol for request data", async () => {
					const result = await uut._validate();
					expect(mockValidationProtocol).toHaveBeenCalled();
					expect(result).toBe(mockValidation);
				});
			});

			describe("_setValidation", () => {
				let mockBefore: jest.Mock;
				let mockExec: jest.Mock;

				beforeEach(() => {
					mockBefore = jest.fn();
					mockExec = jest.fn();

					uut.before = mockBefore;
					Object.assign(ValidationInterceptor.prototype, { exec: mockExec });
				});

				it("should insert '_validate' as a 'before' hook and return the class instance itself", async () => {
					const result = uut._setValidation();
					expect(ValidationInterceptor).toHaveBeenCalledWith(uut);
					expect(mockBefore).toHaveBeenCalledWith(mockExec);
					expect(result).toBe(uut);
				});
			});

			describe("validates", () => {
				let mockSetValidation: jest.Mock;

				beforeEach(() => {
					mockSetValidation = jest.fn();

					uut._setValidation = mockSetValidation;
				});

				it("should call '_setValidation' to setup the validation protocol, and return the class instance itself", () => {
					const result = uut.validates();
					expect(mockSetValidation).toHaveBeenCalled();
					expect(result).toBe(uut);
				});
			});
		});

		describe("error handling", () => {
			describe("static assignErrors", () => {
				const mockErrorAssignments = { some: "error-assignment" };

				it("should assign an error dictionary object to '_errorsDictionary' field of the class", () => {
					BaseController.assignErrors(MockController, mockErrorAssignments);
					expect(MockController._errorsDictionary).toEqual(mockErrorAssignments);
				});
			});

			describe("assignErrors", () => {
				const mockErrorAssignments = { some: "error-assignment" };

				it("should assign an error dictionary object to '_errorsDictionary' field of a class instance", () => {
					uut.assignErrors(mockErrorAssignments);
					expect(uut._errorsDictionary).toEqual(mockErrorAssignments);
				});
			});

			describe("errorHandler", () => {
				const mockError = new Error("some-error");

				beforeEach(() => {
					mockChainErrorHandler = jest.fn();
				});

				it("should call error handler of super", () => {
					uut.errorHandler(mockError);
					expect(mockChainErrorHandler).toHaveBeenCalledWith(mockError);
				});

				describe("when the error is in the error dictionary", () => {
					const mockError = new Error("some-nown-error");

					const knownErrorName = "someKnownError";
					const knownErrorStatus = 424242;
					const knownErrorMessage = "known-error-message";
					const knownErrorStack = "known-error-stack-trace";

					let mockKnownErrorConstructor: jest.Mock;
					class MockKnownError {
						constructor(errorMessage?: any) {
							mockKnownErrorConstructor(errorMessage);
						}
						name = knownErrorName;
						status = knownErrorStatus;
						message = knownErrorMessage;
						stack = knownErrorStack;
					}

					let mockKnownError: MockKnownError;

					beforeEach(() => {
						mockKnownErrorConstructor = jest.fn();
						uut._errorsDictionary = {
							[knownErrorName]: MockKnownError
						};

						mockError.name = knownErrorName;
						mockKnownError = new MockKnownError();
					});

					it("should create a known error instance with the input error's message", async () => {
						await uut.errorHandler(mockError);
						expect(mockKnownErrorConstructor).toHaveBeenCalledWith(mockError.message);
					});

					it("should set the status to the known error status", async () => {
						await uut.errorHandler(mockError);
						expect(uut.status).toBe(knownErrorStatus);
					});

					it("should set the controlled result with the known error and input error's stack", async () => {
						await uut.errorHandler(mockError);
						expect(uut._controlledResult).toEqual({
							data: null,
							success: false,
							error: mockKnownError.message,
							stack: mockError.stack
						});
					});
				});

				describe("when error is not in the error dictionary  (internal error setting)", () => {
					it("should set the status to internal server error", async () => {
						await uut.errorHandler(mockError);
						expect(uut.status).toBe(STATUS.INTERNAL_SERVER_ERROR);
					});

					it("should set the controlled result with the input error and input error's stack", async () => {
						await uut.errorHandler(mockError);
						expect(uut._controlledResult).toEqual({
							data: null,
							success: false,
							error: mockError.message,
							stack: mockError.stack
						});
					});

					describe("when error is undefined", () => {
						const newError = new Error();

						it("should set the status to internal server error", async () => {
							await uut.errorHandler(undefined);
							expect(uut.status).toBe(STATUS.INTERNAL_SERVER_ERROR);
						});

						it("should create a new error and set the controlled result with the new error and new error's stack", async () => {
							const newErrorStack = expect.anything();

							await uut.errorHandler(undefined);
							expect(uut._controlledResult).toEqual({
								data: null,
								success: false,
								error: newError.message,
								stack: newErrorStack
							});
						});
					});
				});
			});
		});
	});
});
