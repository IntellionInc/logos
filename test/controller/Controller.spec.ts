import { Request, Response } from "express";
import { Chain } from "@intellion/arche";
import {
	BaseController,
	BaseInterceptor,
	AuthInterceptor,
	ValidationInterceptor
} from "src/controller";
import { BaseSerializer } from "src/controller/serializers";
import { STATUS } from "src/controller/StatusCodes";

class MockController extends BaseController {}

jest.mock("../../src/controller/interceptors/DerivedInterceptors");

jest.mock("@intellion/arche", () => ({
	Chain: class MockChain {
		initially = jest.fn().mockReturnThis();
		main = jest.fn().mockReturnThis();
		finally = jest.fn().mockReturnThis();
	}
}));

jest.mock("../../src/controller/serializers/BaseSerializer");

describe("Controller: ", () => {
	let request: Request, response: Response;
	let uut: MockController;

	describe("class constructor", () => {
		let instance: BaseController;
		beforeEach(() => {
			request = {} as Request;
			response = {} as Response;

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
				await uut._control();
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
				{ some: "interception" },
				{ some: "serialized-result" },
				{ some: "controlled-result" }
			];

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
					expect(uut.responseData).toBe(mockInterception);
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
					data: "Default Auth Protocol"
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
				const [meta, responseData] = [{ some: "meta" }, { some: "response-data" }];

				beforeEach(() => {
					Object.assign(uut, { meta, responseData });
				});

				describe("when the response status is success", () => {
					const status = 242;
					const successResponse = { status, meta, data: responseData };

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
					const failureResponse = { status, meta, error: responseData };

					beforeEach(() => {
						mockConsoleTrace = jest.fn();
						actualConsoleTrace = console.trace;
						console.trace = mockConsoleTrace;
						Object.assign(uut, { status, stack: mockConsoleTrace });
					});

					afterEach(() => {
						console.trace = actualConsoleTrace;
					});

					it("should attach 'error' and 'stack' fields to response message, it should not attach a 'data' field", async () => {
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
					const mockSerializedResult = { some: "serialized-data" };

					beforeEach(() => {
						mockSerialize = jest.fn().mockResolvedValueOnce(mockSerializedResult);

						BaseSerializer.serialize = mockSerialize;
					});

					describe("when the result has a data field", () => {
						const mockControlledResult = { data: "some-data" };

						beforeEach(() => {
							uut._controlledResult = mockControlledResult;
						});

						it("should serialize the data field of the result returned by controller method", async () => {
							await uut._serialize();
							expect(uut._serializedResult).toBe(mockSerializedResult);
							expect(mockSerialize).toHaveBeenCalledWith(
								MockSerializer,
								mockControlledResult.data
							);
						});
					});

					describe("when the result doesn't have a data field", () => {
						const mockControlledResult = { some: "controller-result" };

						beforeEach(() => {
							uut._controlledResult = mockControlledResult;
						});

						it("should serialize the result returned by controller method", async () => {
							await uut._serialize();
							expect(uut._serializedResult).toBe(mockSerializedResult);
							expect(mockSerialize).toHaveBeenCalledWith(
								MockSerializer,
								mockControlledResult
							);
						});
					});
				});

				describe("when serialization fails", () => {
					const mockControlledResult = { some: "controller-result" };
					const failedSerialization = { success: false };
					const failedStatus = STATUS.INTERNAL_SERVER_ERROR;

					beforeEach(() => {
						uut._controlledResult = mockControlledResult;

						mockSerialize = jest.fn().mockResolvedValueOnce(failedSerialization);
						BaseSerializer.serialize = mockSerialize;
					});

					it(`should set the status to ${STATUS.INTERNAL_SERVER_ERROR}`, async () => {
						await uut._serialize();
						expect(uut.status).toBe(failedStatus);
						expect(uut._serializedResult).toBe(failedSerialization);
						expect(mockSerialize).toHaveBeenCalledWith(
							MockSerializer,
							mockControlledResult
						);
					});
				});

				describe("when there is a serialization error", () => {
					const mockControlledResult = { some: "controller-result" };
					const [errorMessage, errorStack] = [
						"serialization-error-message",
						"serialization-error-stack"
					];
					const serializationError = {
						message: errorMessage,
						stack: errorStack
					};
					const thrownSerialization = {
						success: false,
						error: serializationError,
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
				const defaultValidation = { success: true, data: defaultValidationData };

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
				let mockHandle: jest.Mock;

				const hookError = { handle: null };

				const errorMessage = "some-error-message";
				const errorStack = "some-error-stack-trace";
				const error = {
					name: "someError",
					message: errorMessage,
					stack: errorStack
				};

				beforeEach(() => {
					mockHandle = jest.fn();
				});

				describe("when the error is defined in errors dictionary", () => {
					describe("when the error has a 'handle' property", () => {
						const returnedErrorMessage = "returned-error-message";
						const returnedErrorStack = "returned-error-stack";
						const mockReturnedError = {
							name: "someReturnedError",
							status: 444444,
							message: returnedErrorMessage,
							stack: returnedErrorStack
						};

						const recursiveErrorStatus = 434343;
						const recursiveErrorMessage = "recursive-error-message";
						class mockRecursiveKnownError {
							name = "recursiveKnownError";
							status = recursiveErrorStatus;
							message = recursiveErrorMessage;
							handle = jest.fn().mockRejectedValueOnce(mockReturnedError);
						}

						const knownErrorStatus = 424242;
						const knownErrorMessage = "known-error-message";
						const knownErrorStack = "known-error-stack-trace";
						class mockKnownError {
							name = "someKnownError";
							status = knownErrorStatus;
							message = knownErrorMessage;
							stack = knownErrorStack;
						}

						const defaultControlledResult = {
							error: new mockKnownError(),
							stack: returnedErrorStack
						};

						beforeEach(() => {
							mockHandle.mockRejectedValueOnce(error);

							Object.assign(hookError, { handle: mockHandle });

							Object.assign(uut, {
								_errorsDictionary: {
									[error.name]: mockRecursiveKnownError,
									[mockReturnedError.name]: mockKnownError
								}
							});
						});

						it("should perform error handling recursively", async () => {
							await uut.errorHandler(hookError);
							expect(uut.status).toBe(knownErrorStatus);
							expect(uut._controlledResult).toEqual(defaultControlledResult);
						});
					});

					describe("when the error does not have a 'handle' property", () => {
						const knownErrorStatus = 424242;
						const knownErrorMessage = "known-error-message";

						class mockKnownError {
							name = "someKnownError";
							status = knownErrorStatus;
							message = knownErrorMessage;
						}

						const mockControlledResult = {
							error: new mockKnownError(),
							stack: errorStack
						};

						beforeEach(() => {
							mockHandle.mockRejectedValueOnce(error);
							Object.assign(hookError, { handle: mockHandle });
							Object.assign(uut, {
								_errorsDictionary: {
									[error.name]: mockKnownError
								}
							});
						});

						it("should set response with correct message, status and stack", async () => {
							await uut.errorHandler(hookError);
							expect(uut.status).toEqual(knownErrorStatus);
							expect(uut._controlledResult).toEqual(mockControlledResult);
						});
					});
				});

				describe("when the error is not defined in errors dictionary", () => {
					const errorMessage = "some-error-message";
					const errorStack = "some-error-stack-trace";
					const error = {
						name: "someError",
						message: errorMessage,
						stack: errorStack
					};

					const defaultFailureStatus = STATUS.INTERNAL_SERVER_ERROR;
					const defaultControlledResult = { error, stack: errorStack };

					beforeEach(() => {
						mockHandle.mockRejectedValueOnce(error);
						Object.assign(hookError, { handle: mockHandle });

						Object.assign(uut, {
							_errorsDictionary: {}
						});
					});

					it("should set response with default failure status, error message and stack", async () => {
						await uut.errorHandler(hookError);
						expect(uut.status).toBe(defaultFailureStatus);
						expect(uut._controlledResult).toEqual(defaultControlledResult);
					});
				});
			});
		});
	});
});
