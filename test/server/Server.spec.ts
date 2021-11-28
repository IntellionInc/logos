import express, { IRouter } from "express";
import * as typeorm from "typeorm";
import { ConnectionManager, ConnectionOptions } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import http from "http";

import { Router } from "src/router";
import { IRoutes } from "src/types";
import { BaseController } from "src/controller";
import { Server, ConnectionManagerController } from "src/server";

jest.mock("express");
jest.mock("typeorm");

jest.mock("../../src/router/Router.ts");
jest.mock("../../src/server/ConnectionManagerController.ts");

jest.mock("@intellion/arche", () => ({
	Chain: class MockChain {
		initially = jest.fn().mockReturnThis();
		before = jest.fn().mockReturnThis();
		main = jest.fn().mockReturnThis();
	}
}));

describe("Server: ", () => {
	let uut: Server;
	beforeEach(() => {
		uut = new Server();
	});

	describe("class constructor", () => {
		it("should be defined", () => {
			expect(uut).toBeDefined();
		});
		it("should have correct properties", () => {
			expect(uut).toHaveProperty("app");

			const { _createServer, _createConnectionManager, _serve } = uut;
			expect(uut.initially).toHaveBeenNthCalledWith(1, _createConnectionManager);
			expect(uut.initially).toHaveBeenNthCalledWith(2, _createServer);
			expect(uut.main).toHaveBeenCalledWith(_serve);
		});
	});

	describe("class methods", () => {
		describe("_createServer", () => {
			const mockApp = express();
			const mockServer = {} as http.Server;
			let serverSpy: jest.SpyInstance;
			beforeEach(() => {
				uut.app = mockApp;
				serverSpy = jest.spyOn(http, "Server").mockReturnValueOnce(mockServer);
			});
			it("should create a new http server instance with correct properties", () => {
				uut._createServer();
				expect(uut.server).toBe(mockServer);
				expect(serverSpy).toHaveBeenCalledWith(mockApp);
			});
		});

		describe("_attachMiddleware", () => {
			const app = { use: null };

			let method1: jest.Mock;
			let method2: jest.Mock;
			let middleware: jest.Mock[] = [];

			let mockUseMethod: jest.Mock;

			beforeEach(() => {
				[method1, method2] = [jest.fn(), jest.fn()];
				mockUseMethod = jest.fn();
				middleware = [method1, method2];
				app.use = mockUseMethod;
				Object.assign(uut, { app });
			});
			it("should attach middleware to app", () => {
				uut._attachMiddleware(middleware);
				expect.assertions(2);
				middleware.forEach(method => {
					expect(mockUseMethod).toHaveBeenCalledWith(method);
				});
			});
		});

		describe("_attachRouter", () => {
			const app = { use: null };
			const mockRouter = {} as IRouter;
			const routes = {} as IRoutes;
			const controllers = [{} as typeof BaseController];

			let mockUseMethod: jest.Mock;
			let mockRouterMap: jest.Mock;
			beforeEach(() => {
				mockUseMethod = jest.fn();
				mockRouterMap = jest.fn().mockReturnValue(mockRouter);

				app.use = mockUseMethod;
				Object.assign(uut, { app });

				Object.assign(Router.prototype, {
					map: mockRouterMap
				});
			});
			it("should attach routes to app", () => {
				uut._attachRouter({ routes, controllers });

				expect(Router).toHaveBeenCalledWith(routes, controllers);
				expect(mockUseMethod).toHaveBeenCalled();
				expect(mockRouterMap).toHaveBeenCalled();
			});
		});

		describe("_serve", () => {
			let mockServerListen: jest.Mock;
			const server = { listen: null };

			describe("When there are no errors", () => {
				const mockConnectionManager = {};
				let callbackFn: any;
				beforeEach(() => {
					Object.assign(uut, { connectionManager: mockConnectionManager });
					mockServerListen = jest
						.fn()
						.mockImplementation((port: string, callback: (...args: any[]) => any) => {
							callbackFn = callback;
							return new Promise(resolve => resolve(callback));
						});

					server.listen = mockServerListen;
					Object.assign(uut, { server });
				});

				it("should listen on the provided port, and set yield", async () => {
					await uut._serve();
					expect(uut.yield).toBe(mockConnectionManager);
					expect(mockServerListen).toHaveBeenCalledWith(process.env.PORT, callbackFn);
				});
			});

			describe("When there is an error", () => {
				const error = { message: "some-error-message" } as Error;
				beforeEach(() => {
					mockServerListen = jest.fn().mockRejectedValueOnce(error);

					server.listen = mockServerListen;
					Object.assign(uut, { server });
				});

				it("should handle error", async () => {
					expect.assertions(1);
					try {
						await uut._serve();
					} catch (err) {
						expect(err).toBe(error);
					}
				});
			});
		});

		describe("_createConnectionManager", () => {
			const mockConnectionManager = {} as ConnectionManager;
			let connectionManagerSpy: jest.SpyInstance;
			beforeEach(() => {
				connectionManagerSpy = jest
					.spyOn(typeorm, "ConnectionManager")
					.mockReturnValue(mockConnectionManager);
			});
			it("should create a Connection Manager and set 'ConnectionManagerController' instance accordingly", () => {
				uut._createConnectionManager();
				expect(connectionManagerSpy).toHaveBeenCalled();
				expect(uut.connectionManager).toBe(mockConnectionManager);
				expect(ConnectionManagerController.connectionManager).toBe(mockConnectionManager);
			});
		});

		describe("_createConnection", () => {
			const connectionName = "some-connection-name";
			const dbConfig = { some: "config" } as unknown as ConnectionOptions;
			const options = { name: connectionName, ...dbConfig };
			let mockCreate: jest.Mock;
			beforeEach(() => {
				mockCreate = jest.fn();

				Object.assign(uut, {
					connectionManager: {
						create: mockCreate
					}
				});
			});
			it("should create a new connection instance", () => {
				uut._createConnection(connectionName, dbConfig);
				expect(mockCreate).toHaveBeenCalledWith(options);
			});
		});

		describe("usePostgres", () => {
			const connectionName = "some-connection-name";
			const dbConfig = { some: "config" } as unknown as PostgresConnectionOptions;
			let boundCreateConnection: jest.Mock;
			beforeEach(() => {
				boundCreateConnection = jest.fn();
				uut._createConnection.bind = jest.fn().mockReturnValue(boundCreateConnection);
			});
			it("should set a before hook with '_createConnection'", () => {
				const result = uut.usePostgres(connectionName, dbConfig);
				expect(uut._createConnection.bind).toHaveBeenCalledWith(
					uut,
					connectionName,
					dbConfig
				);
				expect(uut.before).toHaveBeenCalledWith(boundCreateConnection);
				expect(result).toBe(uut);
			});
		});

		describe("useMiddleware", () => {
			const middleware = [jest.fn()];
			let boundAttachMiddleware: jest.Mock;
			beforeEach(() => {
				boundAttachMiddleware = jest.fn();
				uut._attachMiddleware.bind = jest.fn().mockReturnValue(boundAttachMiddleware);
			});

			it("should set a before hook with '_attachMiddleware'", () => {
				const result = uut.useMiddleware(middleware);
				expect(uut._attachMiddleware.bind).toHaveBeenCalledWith(uut, middleware);
				expect(uut.before).toHaveBeenCalledWith(boundAttachMiddleware);
				expect(result).toBe(uut);
			});
		});

		describe("useRouter", () => {
			const routes = {} as IRoutes;
			const controllers = [] as typeof BaseController[];
			let boundAttachRouter: jest.Mock;
			beforeEach(() => {
				boundAttachRouter = jest.fn();
				uut._attachRouter.bind = jest.fn().mockReturnValue(boundAttachRouter);
			});

			it("should set a before hook with '_attachRouter'", () => {
				const result = uut.useRouter(routes, controllers);
				expect(uut._attachRouter.bind).toHaveBeenCalledWith(uut, { routes, controllers });
				expect(uut.before).toHaveBeenCalledWith(boundAttachRouter);
				expect(result).toBe(uut);
			});
		});
	});
});
