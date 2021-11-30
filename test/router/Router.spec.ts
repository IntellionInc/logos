import express from "express";
import { Router } from "src/router";
import { ControllerList } from "src/types";

jest.mock("express", () => ({
	express: class MockExpress {
		static Router = jest.fn();
	}
}));
describe("Router", () => {
	const mockRoutes = {};
	const mockControllers = {} as ControllerList;

	let uut: any;
	beforeEach(() => {
		uut = new Router(mockRoutes, mockControllers);
	});

	describe("constructor", () => {
		it("should be defined with the correct properties", () => {
			expect(uut).toBeDefined();
			expect(uut).toBeInstanceOf(Router);
			expect(uut.routes).toEqual(mockRoutes);
			expect(uut.controllers).toEqual(mockControllers);
		});
	});

	describe("class methods", () => {
		describe("map", () => {
			const mockRouter = {};

			beforeEach(() => {
				uut._map = jest.fn().mockReturnValue(mockRouter);
			});

			it("should call and return the method _map", () => {
				const result = uut.map();
				expect(result).toEqual(mockRouter);
				expect(uut._map).toHaveBeenCalledWith(mockRoutes);
			});
		});

		describe("_map", () => {
			const mockExpressRouter = {};
			const mockRouter = {};
			const mockLayer = {};
			beforeEach(() => {
				express.Router = jest.fn().mockReturnValue(mockExpressRouter);
			});

			afterEach(() => {
				expect(express.Router).toHaveBeenCalledWith({ mergeParams: true });
				expect(uut.isDeepestLayer).toHaveBeenCalledWith(mockLayer);
			});

			describe("when the input layer is the deepest layer", () => {
				beforeEach(() => {
					uut.isDeepestLayer = jest.fn().mockReturnValue(true);
					uut.route = jest.fn().mockReturnValue(mockRouter);
				});

				it("should call and return the route function", () => {
					const result = uut._map(mockLayer);
					expect(result).toEqual(mockRouter);
					expect(uut.route).toHaveBeenCalledWith(mockExpressRouter, mockLayer);
				});
			});

			describe("when the input layer is not the deepest layer", () => {
				beforeEach(() => {
					uut.isDeepestLayer = jest.fn().mockReturnValue(false);
					uut.use = jest.fn().mockReturnValue(mockRouter);
				});

				it("should call and return the use function", () => {
					const result = uut._map(mockLayer);
					expect(result).toEqual(mockRouter);
					expect(uut.use).toHaveBeenCalledWith(mockRouter, mockLayer);
				});
			});
		});

		describe("isDeepestLayer", () => {
			const layer1 = { key1: "some-item", key2: "some-item" };
			const layer2 = { key1: 4242, key2: "some-item" };

			it("should return true for deepest layer case", () => {
				expect(uut.isDeepestLayer(layer1)).toBe(true);
			});

			it("should return false for other cases", () => {
				expect(uut.isDeepestLayer(layer2)).toBe(false);
			});
		});

		describe("route", () => {
			const mockRouter = { route: null };
			const mockLayer = {
				someLayerKey: "controller => method",
				some: { inner: "layer" }
			};
			let mockSomeMethod: any, mockBind: any;

			beforeEach(() => {
				mockSomeMethod = jest.fn();
				Object.assign(mockRouter, {
					route: jest.fn().mockReturnValue({ someLayerKey: mockSomeMethod })
				});
				mockBind = jest.fn().mockReturnValue("some-bound-method");
				uut.methodGetter.bind = mockBind;
			});

			it("should connect endpoints to the correct controller methods", () => {
				const result = uut.route(mockRouter, mockLayer);
				expect(result).toBe(mockRouter);
				expect(mockRouter.route).toHaveBeenNthCalledWith(1, "/");
				expect(mockRouter.route).toHaveBeenNthCalledWith(2, "/");
				expect(mockSomeMethod).toHaveBeenCalledWith("some-bound-method");
				expect(mockBind).toHaveBeenCalled();
			});
		});

		describe("methodGetter", () => {
			const args: any[] = [];
			const matcher = ["controller", "method"];
			let mockControls: jest.Mock;
			let mockExec: jest.Mock;

			beforeEach(() => {
				mockExec = jest.fn().mockReturnValue("some-exec-return");
				mockControls = jest.fn().mockReturnValue({ x: mockExec() });
				class MockController {
					controls = mockControls;
				}
				Object.assign(uut.controllers, {
					controller: MockController
				});
			});

			it("should return the controller method", async () => {
				const result = await uut.methodGetter(matcher, args);
				expect(mockControls).toHaveBeenCalledWith(matcher[1]);
				expect(result).toBe("some-exec-return");
			});
		});

		describe("use", () => {
			const mockRouter = { some: "router" };
			const mockRoutedRouter = { use: null };
			const mockLayer = { someLayerKey: "some-layer" };

			beforeEach(() => {
				Object.assign(mockRoutedRouter, { use: jest.fn() });
				uut._map = jest.fn().mockReturnValue({ someRouterKey: "some-router-below" });
				uut.route = jest.fn().mockReturnValue(mockRoutedRouter);
			});

			it("should attach the routers for depper layers", () => {
				const result = uut.use(mockRouter, mockLayer);
				expect(result).toEqual(mockRoutedRouter);
				expect(uut.route).toHaveBeenCalledWith(mockRouter, mockLayer);
				expect(uut._map).toHaveBeenCalledWith("some-layer");
				expect(mockRoutedRouter.use).toHaveBeenCalledWith("someLayerKey", {
					someRouterKey: "some-router-below"
				});
			});
		});
	});
});
