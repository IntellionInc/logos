import express, { Request, Response } from "express";
import { BaseController, BaseDto } from "src/controller";
import { Router } from "src/router";
import { ControllerList, DtoList } from "src/types";

jest.mock("express", () => ({
	express: class MockExpress {
		static Router = jest.fn();
	}
}));

jest.mock("src/controller/Controller.ts");

describe("Router", () => {
	const mockRoutes = {};
	const mockControllers = {} as ControllerList;
	const mockDtos = <DtoList>(<unknown>{ controller: { method: jest.fn() } });
	let uut: any;
	beforeEach(() => {
		uut = new Router(mockRoutes, mockControllers, mockDtos);
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
				uut.runControllerMethod.bind = mockBind;
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

		describe("runControllerMethod", () => {
			const request = {} as Request;
			const response = {} as Response;
			const args = [request, response];

			const mockControllerName = "controller";
			const mockMethodName = "method";
			const matchers = [mockControllerName, mockMethodName];
			const mockErrorsDictionary = {};

			let MockControllerClass: typeof BaseController;

			let mockAssignErrors: jest.Mock;
			let mockStaticAssignErrors: jest.Mock;
			let mockControls: jest.Mock;
			let mockExec: jest.Mock;

			beforeEach(() => {
				mockAssignErrors = jest.fn();
				mockStaticAssignErrors = jest.fn();
				mockControls = jest.fn().mockReturnThis();
				mockExec = jest.fn();

				class MockController extends BaseController {}
				MockControllerClass = MockController;

				Object.assign(MockController, {
					assignErrors: mockStaticAssignErrors,
					_errorsDictionary: mockErrorsDictionary
				});

				Object.assign(MockController.prototype, {
					assignErrors: mockAssignErrors,
					controls: mockControls,
					x: mockExec,
					dtos: { body: null }
				});

				Object.assign(uut, { controllers: { controller: MockController } });
			});

			it("should return execution method of the correct controller instance", async () => {
				const result = await uut.runControllerMethod(matchers, ...args);
				expect(result).toBe(mockExec);
			});

			describe("controller instance and class assignment", () => {
				it("should find the proper controller, and set class parameters accordingly", async () => {
					await uut.runControllerMethod(matchers, ...args);

					expect(uut.Controller).toBe(MockControllerClass);
					expect(uut.controller).toBeInstanceOf(MockControllerClass);
				});
			});

			describe("dto assignment", () => {
				const mockDto = { validate: jest.fn() } as unknown as typeof BaseDto;
				const mockDtos = {};

				describe("when there is a proper dto", () => {
					describe("when the dto is non-specific", () => {
						beforeEach(() => {
							Object.assign(mockDtos, {
								[mockControllerName]: {
									[mockMethodName]: mockDto
								}
							});

							uut.dtos = mockDtos;
						});

						it("should find and assign the proper dto to body dto field in the controller", async () => {
							await uut.runControllerMethod(matchers, ...args);
							expect(uut.controller.dtos.body).toBe(mockDto);
						});
					});

					describe("when the dto is for specific fields in the controller", () => {
						const bodyDto = {} as typeof BaseDto;
						const paramsDto = {} as typeof BaseDto;
						const queryDto = {} as typeof BaseDto;

						beforeEach(() => {
							Object.assign(mockDtos, {
								[mockControllerName]: {
									[mockMethodName]: { body: bodyDto, params: paramsDto, query: queryDto }
								}
							});

							uut.dtos = mockDtos;
						});

						it("should assign each dto field to respective controller dto field", async () => {
							await uut.runControllerMethod(matchers, ...args);
							const { body, params, query } = uut.controller.dtos;
							expect(body).toBe(bodyDto);
							expect(params).toBe(paramsDto);
							expect(query).toBe(queryDto);
						});
					});
				});

				describe("when there is no dto for the controller", () => {
					beforeEach(() => {
						Object.assign(mockDtos, {
							[mockControllerName]: null
						});

						uut.dtos = mockDtos;
					});

					it("should leave dto field for the controller undefined", async () => {
						await uut.runControllerMethod(matchers, ...args);
						expect(uut.controller.dto).toBeUndefined();
					});
				});

				describe("when there is no controller entry for the required dto", () => {
					beforeEach(() => {
						delete mockDtos[mockControllerName];

						uut.dtos = mockDtos;
					});

					it("should leave dto field for the controller undefined", async () => {
						await uut.runControllerMethod(matchers, ...args);
						expect(uut.controller.dto).toBeUndefined();
					});
				});
			});

			describe("error assignment", () => {
				it("should call 'assignErrors' on controller instance to assign errors of the contoller class to controller instance", async () => {
					await uut.runControllerMethod(matchers, ...args);
					expect(mockAssignErrors).toHaveBeenCalledWith(mockErrorsDictionary);
				});
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
