import axios from "axios";
import { BaseHTTPCommunicator } from "src/communicator";

describe("BaseHTTPCommunicator", () => {
	let mockErrorHandler: any;
	const mockConfig = { baseURL: "some-url", timeout: 4242, headers: { some: "header" } };
	class MockCommunicator extends BaseHTTPCommunicator {
		constructor() {
			super(mockConfig, mockErrorHandler);
		}
	}

	const mockAxios = axios.create();

	let uut: any;
	beforeEach(() => {
		mockErrorHandler = jest.fn();
		axios.create = jest.fn().mockReturnValue(mockAxios);
		uut = new MockCommunicator();
	});

	describe("constructor", () => {
		const properties = ["axios", "get", "post", "put", "patch", "delete"];
		it("should be defined with correct properties", () => {
			expect(uut).toBeDefined();
			expect(uut).toBeInstanceOf(MockCommunicator);
			expect(axios.create).toHaveBeenCalledWith(mockConfig);
			properties.forEach(property => {
				expect(uut).toHaveProperty(property);
			});
		});
	});

	describe("class methods", () => {
		const methods = ["get", "post", "put", "patch", "delete"];
		const mockArgs = "some-url";
		methods.forEach(method => {
			describe(method, () => {
				beforeEach(() => {
					uut.axios[method] = jest.fn().mockResolvedValue({ data: "some-result" });
				});
				it(`should call the ${method} method of the axios instance`, async () => {
					const result = await uut[method](mockArgs);
					expect(result).toBe("some-result");
					expect(uut.axios[method]).toHaveBeenCalledWith(mockArgs);
				});
				describe("when there is a request error", () => {
					beforeEach(() => {
						uut.axios[method] = jest.fn().mockRejectedValue({ message: "some-error" });
					});
					it("should call the error handler", async () => {
						await uut[method](mockArgs);
						expect(uut.axios[method]).toHaveBeenCalledWith(mockArgs);
						expect(mockErrorHandler).toHaveBeenCalledWith({ message: "some-error" });
					});
				});
			});
		});
	});
});
