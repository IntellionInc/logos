import { Request, Response } from "express";
import { Chain } from "@intellion/arche";
import { BaseController, AuthInterceptor, BaseInterceptor } from "src/controller";
import { BaseSerializer } from "src/controller/serializers";

class MockController extends BaseController {}

jest.mock("../../src/controller/interceptors/DerivedInterceptors");

jest.mock("@intellion/arche", () => ({
	Chain: class MockChain {
		initially = jest.fn().mockReturnThis();
		main = jest.fn().mockReturnThis();
		finally = jest.fn().mockReturnThis();
	}
}));
describe("Controller: ", () => {
	let request: Request, response: Response;
	let uut: MockController;

	const MockInterceptor = { exec: null } as unknown as BaseInterceptor;

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
				status: 200
			};

			Object.keys(properties).forEach(key => {
				expect(instance).toHaveProperty(key);
				expect(instance[key as keyof MockController]).toEqual(properties[key]);
			});

			const { _setAuthenticates, _setupInterceptors, _control, _setStatus, _respond } =
				instance;
			expect(instance.initially).toHaveBeenNthCalledWith(1, _setupInterceptors);
			expect(instance.initially).toHaveBeenNthCalledWith(2, _setAuthenticates);
			expect(instance.main).toHaveBeenCalledWith(_control);
			expect(instance.finally).toHaveBeenNthCalledWith(1, _setStatus);
			expect(instance.finally).toHaveBeenNthCalledWith(2, _respond);
		});
	});

	beforeEach(() => {
		request = {} as Request;
		response = {} as Response;
		uut = new MockController(request, response);
	});

	describe("syntactic sugar", () => {
		describe("one", () => {
			it("should be equal to class instance itself", () => {
				expect(uut.one).toBe(uut);
			});
		});
	});

	describe("class methods", () => {
		const defaultAuthProtocol = {
			success: true,
			data: "Default Auth Protocol"
		};
		describe("authProtocol", () => {
			it("should return successful with the pre-determined data by default", async () => {
				const result = await uut.authProtocol();
				expect(result).toEqual(defaultAuthProtocol);
			});
		});
		describe("validationProtocol", () => {
			const defaultValidationProtocol = {
				success: true,
				data: "Default Validation Protocol"
			};
			it("should return successful with the pre-determined data by default", async () => {
				const result = await uut.validationProtocol();
				expect(result).toEqual(defaultValidationProtocol);
			});
		});
	});

	describe("controls", () => {
		let someFn: (...args: any[]) => any;
		beforeEach(() => {
			someFn = jest.fn();
			Object.assign(uut, { someFn });
		});
		it("should set the controlled function and return this", () => {
			const result = uut.controls("someFn");
			expect(result).toBe(uut);
			expect(uut._controlledFunction).toBe(someFn);
		});
	});

	describe("serializes", () => {
		let mockSerialize: jest.Mock;
		beforeEach(() => {
			uut.after = jest.fn();
			mockSerialize = jest.fn();
			uut._serialize = mockSerialize;
		});
		it("should add '_serialize' hook to _afterHooks", () => {
			uut.serializes();
			expect(uut.after).toHaveBeenCalledWith(mockSerialize);
		});
	});

	describe("authenticates", () => {
		beforeEach(() => {
			uut.interceptors = [];
		});

		it("should add a new 'AuthInterceptor' hook to _beforeHooks", () => {
			uut.authenticates();
			expect(AuthInterceptor).toHaveBeenCalledWith(uut);
			expect(uut.interceptors[0]).toBeInstanceOf(AuthInterceptor);
		});
	});

	describe("_setAuthenticates", () => {
		let mockAuthenticates: jest.Mock;
		beforeEach(() => {
			mockAuthenticates = jest.fn();
			uut.authenticates = mockAuthenticates;
		});
		it("should call 'authenticates' method", () => {
			uut._setAuthenticates();
			expect(mockAuthenticates).toHaveBeenCalled();
		});
	});

	describe("_setupInterceptors", () => {
		describe("when interceptors array is empty", () => {
			beforeEach(() => {
				uut.interceptors = [];
				uut.before = jest.fn();
			});
			it("should do nothing", () => {
				const result = uut._setupInterceptors();
				expect(result).toBe(undefined);
				expect(uut.before).not.toHaveBeenCalled();
			});
		});

		describe("when interceptors array is not empty", () => {
			let mockExec: any;
			beforeEach(() => {
				mockExec = jest.fn();
				Object.assign(MockInterceptor, { exec: mockExec });
				uut.interceptors = [MockInterceptor];
				uut.before = jest.fn();
			});
			it("should add interceptors as beforeHooks", () => {
				uut._setupInterceptors();
				expect(uut.before).toHaveBeenCalledWith(mockExec);
			});
		});
	});

	describe("_control", () => {
		const mockRequest = {} as Request;
		beforeEach(() => {
			uut.request = mockRequest;
			Object.assign(uut.response, {
				status: jest.fn()
			});
		});
		describe("for a successful controlled function call", () => {
			const result = { success: true, data: "some-success-data" };
			beforeEach(() => {
				uut._controlledFunction = jest.fn().mockResolvedValue(result);
			});
			it("should call the controlled function with correct parameters", async () => {
				await uut._control();
				expect(uut._controlledResult).toBe(result);
				expect(uut._controlledFunction).toHaveBeenCalledWith(mockRequest);
			});
		});
		describe("for an unsuccessful controlled function call", () => {
			const result = { success: false, data: "some-failure-data" };
			beforeEach(() => {
				uut._controlledFunction = jest.fn().mockResolvedValue(result);
			});
			it("should default to a 500 status code", async () => {
				await uut._control();
				expect(uut._controlledResult).toBe(result);
				expect(uut._controlledFunction).toHaveBeenCalledWith(mockRequest);
				expect(uut.status).toBe(500);
			});
		});
		describe("for a controlled function that throws an error", () => {
			const error = { message: "some-error-message", stack: { some: "error-stack" } };
			const result = { success: false, error: error.message, stack: error.stack };

			beforeEach(() => {
				uut._controlledFunction = jest.fn().mockRejectedValue(error);
			});
			it("should call the controlledFunction and store error", async () => {
				await uut._control();
				expect(uut._controlledResult).toEqual(result);
				expect(uut._controlledFunction).toHaveBeenCalledWith(mockRequest);
				expect(uut.status).toBe(500);
			});
		});
		describe("for a controlled function that rejects an error", () => {
			const error = { message: "some-error-message", stack: { some: "error-stack" } };
			const result = { success: false, error: error.message, stack: error.stack };
			beforeEach(() => {
				uut._controlledFunction = jest.fn().mockRejectedValue(error);
			});
			it("should call the controlledFunction and store error", async () => {
				await uut._control();
				expect(uut._controlledResult).toEqual(result);
				expect(uut._controlledFunction).toHaveBeenCalledWith(mockRequest);
				expect(uut.status).toBe(500);
			});
		});
	});

	describe("_serialize", () => {
		describe("when there are no errors", () => {
			const mockResult = { success: null };
			beforeEach(() => {
				Object.assign(uut, { _controlledResult: { data: "some-data" } });
				BaseSerializer.serialize = jest.fn().mockResolvedValue(mockResult);
			});

			afterEach(() => {
				expect(BaseSerializer.serialize).toHaveBeenCalledWith(
					uut.Serializer,
					"some-data"
				);
				expect(uut._serializedResult).toBe(mockResult);
			});

			describe("when serialization is successful", () => {
				beforeEach(() => {
					Object.assign(mockResult, { data: "some-data", success: true });
				});

				it("should set '_serializedResult' appropriately", async () => {
					await uut._serialize();
				});
			});

			describe("when serialization is unsuccessful", () => {
				beforeEach(() => {
					Object.assign(mockResult, { data: "some-data", success: false });
				});

				it("should set 'status' to 500", async () => {
					await uut._serialize();
					expect(uut.status).toBe(500);
				});
			});
		});

		describe("when there is an error", () => {
			const mockError = { message: "some-serialization-error", stack: "some-stack" };
			const mockResult = {
				success: false,
				error: "some-serialization-error",
				stack: "some-stack"
			};
			beforeEach(() => {
				Object.assign(uut, { _controlledResult: { data: "some-data" } });
				BaseSerializer.serialize = jest.fn().mockRejectedValue(mockError);
			});

			it("should set 'serializedResult' and 'status' accordingly", async () => {
				await uut._serialize();
				expect(uut.status).toBe(500);
				expect(uut._serializedResult).toEqual(mockResult);
				expect(BaseSerializer.serialize).toHaveBeenCalledWith(
					uut.Serializer,
					uut._controlledResult.data
				);
			});
		});
	});

	describe("_respond", () => {
		let send: jest.Mock;
		beforeEach(() => {
			send = jest.fn();
			Object.assign(uut.response, { send });
		});

		describe("when interception is set", () => {
			const mockInterception = "some-interception";
			beforeEach(() => {
				uut._interception = mockInterception;
			});
			it("should respond with interception", async () => {
				await uut._respond();
				expect(send).toHaveBeenCalledWith(mockInterception);
			});
		});

		describe("when interception is not set", () => {
			describe("when serialized result is set", () => {
				const mockSerializedResponse = { success: true, data: "some-serialized-data" };
				beforeEach(() => {
					uut._serializedResult = mockSerializedResponse;
				});
				it("should respond with _serializedResult", async () => {
					await uut._respond();
					expect(send).toHaveBeenCalledWith(mockSerializedResponse);
				});
			});
			describe("when serialized result is not set", () => {
				const mockControlledResponse = { success: true, data: "some-controlled-data" };
				beforeEach(() => {
					uut._controlledResult = mockControlledResponse;
				});
				it("should respond with _controlledResult", async () => {
					await uut._respond();
					expect(send).toHaveBeenCalledWith(mockControlledResponse);
				});
			});
		});
	});

	describe("_setStatus", () => {
		let status: jest.Mock;
		const mockStatus = 4242;
		beforeEach(() => {
			status = jest.fn();
			uut.status = mockStatus;
			Object.assign(uut.response, { status });
		});
		it("should set response status", async () => {
			await uut._setStatus();
			expect(status).toHaveBeenCalledWith(mockStatus);
		});
	});
});
