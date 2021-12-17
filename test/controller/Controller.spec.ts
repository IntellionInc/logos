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

			const { _control, _setStatus, _setYield, _respond } = instance;
			expect(instance.main).toHaveBeenCalledWith(_control);
			expect(instance.finally).toHaveBeenNthCalledWith(1, _setStatus);
			expect(instance.finally).toHaveBeenNthCalledWith(2, _setYield);
			expect(instance.finally).toHaveBeenNthCalledWith(3, _respond);
		});
	});

	beforeEach(() => {
		request = {} as Request;
		response = {} as Response;
		uut = new MockController(request, response);
	});

	describe("syntactic sugar", () => {
		["one", "and"].forEach(property => {
			describe(property, () => {
				it("should be equal to the class instance itself", () => {
					expect(uut[property]).toBe(uut);
				});
			});
		});
	});

	describe("class methods", () => {
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
		describe("responseProtocol", () => {
			const status = 4242;
			const meta = { some: "meta-data" };
			const data = { some: "data" };
			const options = { status, meta, yield: data };
			const defaultResponseProtocol = { status, meta, data };
			beforeEach(() => {
				Object.assign(uut, { ...options });
			});
			it("should return default response fields and their values", async () => {
				const result = await uut.responseProtocol();
				expect(result).toEqual(defaultResponseProtocol);
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
		it("should set the controlled function and return the controller instance", () => {
			const result = uut.controls("someFn");
			expect(result).toBe(uut);
			expect(uut._controlledFunction).toBe(someFn);
		});
	});

	describe("authenticates", () => {
		let mockSetAuthInterceptors: jest.Mock;
		beforeEach(() => {
			mockSetAuthInterceptors = jest.fn();
			uut._setAuthInterceptors = mockSetAuthInterceptors;
		});

		it("shoulde call '_setAuthInterceptors' method and return the class instance itself", () => {
			const result = uut.authenticates();
			expect(mockSetAuthInterceptors).toHaveBeenCalled();
			expect(result).toBe(uut);
		});
	});

	describe("serializes", () => {
		let mockSetSerializers: jest.Mock;
		beforeEach(() => {
			mockSetSerializers = jest.fn();
			uut._setSerializers = mockSetSerializers;
		});
		it("should call '_setSerializers' method and reutrn the class instance itself", () => {
			const result = uut.serializes();
			expect(mockSetSerializers).toHaveBeenCalled();
			expect(result).toBe(uut);
		});
	});

	describe("_setAuthInterceptors", () => {
		let mockBefore: jest.Mock;
		let mockExec: jest.Mock;
		beforeEach(() => {
			mockBefore = jest.fn();
			mockExec = jest.fn();
			Object.assign(uut, { before: mockBefore });
			Object.assign(AuthInterceptor, { prototype: { exec: mockExec } });
		});
		it("should add a new 'AuthInterceptor' hook among 'before' hooks and return  the class instance itself", () => {
			const result = uut._setAuthInterceptors();
			expect(AuthInterceptor).toHaveBeenCalledWith(uut);
			expect(mockBefore).toHaveBeenCalledWith(mockExec);
			expect(result).toBe(uut);
		});
	});

	describe("_setSerializers", () => {
		let mockAfter: jest.Mock;
		let mockSerialize: jest.Mock;
		beforeEach(() => {
			mockAfter = jest.fn();
			mockSerialize = jest.fn();
			uut._serialize = mockSerialize;
			Object.assign(uut, { after: mockAfter });
		});
		it("should add '_serialize' among 'after' hooks, and return the class instance itself", () => {
			const result = uut._setSerializers();
			expect(mockAfter).toHaveBeenCalledWith(mockSerialize);
			expect(result).toBe(uut);
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

	describe("_setYield", () => {
		describe("when there is an interception", () => {
			const interception = "some-interception";
			beforeEach(() => {
				uut._interception = interception;
			});
			it("should set the yield as interception", () => {
				uut._setYield();
				expect(uut.yield).toBe(interception);
			});
		});
		describe("when there is no interception", () => {
			beforeEach(() => {
				uut._interception = undefined;
			});
			describe("when there is a serialized result", () => {
				const serializedResult = { some: "serialized-result" };
				beforeEach(() => {
					uut._serializedResult = serializedResult;
				});
				it("should set the yield as serialized result", () => {
					uut._setYield();
					expect(uut.yield).toBe(serializedResult);
				});
			});
			describe("when there is no serialized result", () => {
				const controlledResult = {
					success: true, // value of this boolean is arbitrary.
					some: "controlled-result"
				};
				beforeEach(() => {
					uut._serializedResult = undefined;
					uut._controlledResult = controlledResult;
				});
				it("should set the yield as controlled result", () => {
					uut._setYield();
					expect(uut.yield).toBe(controlledResult);
				});
			});
		});
	});

	describe("_respond", () => {
		let send: jest.Mock;
		const mockReturnedResponse = { success: true, data: "some-serialized-data" };
		let mockResponseProtocol: jest.Mock;
		beforeEach(() => {
			send = jest.fn();
			Object.assign(uut.response, { send });

			mockResponseProtocol = jest.fn().mockResolvedValueOnce(mockReturnedResponse);
			uut._serializedResult = mockReturnedResponse;
			uut.responseProtocol = mockResponseProtocol;
		});
		it("should respond with _serializedResult", async () => {
			await uut._respond();
			expect(send).toHaveBeenCalledWith(mockReturnedResponse);
			expect(mockResponseProtocol).toHaveBeenCalled();
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
