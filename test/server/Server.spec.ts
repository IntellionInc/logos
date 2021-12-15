import http from "http";
import express, { IRouter } from "express";
import * as typeorm from "typeorm";
import { BaseEntity, ConnectionManager } from "typeorm";

import { Router } from "src/router";
import { Server, ConnectionManagerController } from "src/server";
import { ControllerList, IPostgresConnection, IRoutes } from "src/types";

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
	const defaultPort = "5432";

	beforeEach(() => {
		uut = new Server();
	});

	describe("class constructor", () => {
		it("should be defined", () => {
			expect(uut).toBeDefined();
		});
		it("should have correct properties", () => {
			expect(uut).toHaveProperty("app");
			expect(uut).toHaveProperty("defaultPort");
			expect(uut.defaultPort).toBe(defaultPort);

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
			const controllers = {} as ControllerList;

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

		describe("_onListenCallback", () => {
			let mockConsoleLog: jest.Mock;
			let actualConsoleLog: any;

			const dbPort = "4242";
			const listenMessage = `App running on port: ${dbPort}`;

			beforeEach(() => {
				mockConsoleLog = jest.fn();
				actualConsoleLog = console.log;
				console.log = mockConsoleLog;
			});
			afterEach(() => {
				console.log = actualConsoleLog;
			});
			it("should log the correct message to console", () => {
				uut._onListenCallback(dbPort);
				expect(mockConsoleLog).toHaveBeenCalledWith(listenMessage);
			});
		});

		describe("_serve", () => {
			let mockServerListen: jest.Mock;
			const server = { listen: null };

			const mockConnectionManager = {};
			let boundCallback: jest.Mock;
			let mockCallback: jest.Mock;
			let actual: Record<string, string>;
			const dbPort = "4242";
			beforeEach(() => {
				actual = process.env;

				Object.assign(uut, { connectionManager: mockConnectionManager });
				mockServerListen = jest.fn();

				boundCallback = jest.fn();
				mockCallback = jest.fn().mockReturnValueOnce(boundCallback);
				uut._onListenCallback.bind = mockCallback;

				server.listen = mockServerListen;
				Object.assign(uut, { server });
			});
			afterEach(() => {
				process.env = actual;
			});
			describe("when a port is specified", () => {
				beforeEach(() => {
					process.env.PORT = dbPort;
				});
				it("should use the specified port", async () => {
					await uut._serve();
					expect(uut.yield).toBe(mockConnectionManager);
					expect(mockServerListen).toHaveBeenCalledWith(dbPort, boundCallback);
					expect(mockCallback).toHaveBeenCalledWith(uut, dbPort);
				});
			});
			describe("when a port is not specified", () => {
				beforeEach(() => {
					process.env = {};
				});
				it("should use the default port", async () => {
					await uut._serve();
					expect(uut.yield).toBe(mockConnectionManager);
					expect(mockServerListen).toHaveBeenCalledWith(defaultPort, boundCallback);
					expect(mockCallback).toHaveBeenCalledWith(uut, defaultPort);
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
			const mockEntity1 = new BaseEntity();
			const mockEntity2 = new BaseEntity();
			const dbConfig = {
				some: "config",
				entities: [mockEntity1, mockEntity2]
			} as unknown as IPostgresConnection;
			const options = { name: connectionName, ...dbConfig };
			const mockReturnedConnection = {};

			let mockCreate: jest.Mock;
			let mockEstablishConnection: jest.Mock;
			let mockUseConnection: jest.Mock;
			beforeEach(() => {
				mockCreate = jest.fn().mockReturnValueOnce(mockReturnedConnection);
				mockEstablishConnection = jest.fn();
				uut._establishConnection = mockEstablishConnection;
				mockUseConnection = jest.fn();

				Object.assign(mockEntity1, { useConnection: mockUseConnection });
				Object.assign(mockEntity2, { useConnection: mockUseConnection });
				Object.assign(uut, {
					connectionManager: {
						create: mockCreate
					}
				});
			});

			afterEach(() => {
				jest.restoreAllMocks();
			});
			it("should create a new connection instance", async () => {
				await uut._createConnection(connectionName, dbConfig);
				expect(mockCreate).toHaveBeenCalledWith(options);
				expect(mockUseConnection).toHaveBeenNthCalledWith(1, mockReturnedConnection);
				expect(mockUseConnection).toHaveBeenNthCalledWith(2, mockReturnedConnection);
				expect(mockEstablishConnection).toHaveBeenCalledWith(mockReturnedConnection);
			});
		});

		describe("_establishConnection", () => {
			const mockConnection = { connect: null } as typeorm.Connection;
			let mockConnect: jest.Mock;
			const mockResolvedConnection = {};
			beforeEach(() => {
				mockConnect = jest.fn().mockResolvedValueOnce(mockResolvedConnection);
				mockConnection.connect = mockConnect;
			});
			it("should call 'connect' method of the Entity", async () => {
				await uut._establishConnection(mockConnection);
				expect(mockConnect).toHaveBeenCalled();
			});
		});

		describe("usePostgres", () => {
			const connectionName = "some-connection-name";
			const dbConfig = { some: "config" } as unknown as IPostgresConnection;
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
			const controllers = {} as ControllerList;
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
