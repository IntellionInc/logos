import http from "http";
import express, { IRouter } from "express";
import * as typeorm from "typeorm";
import { BaseEntity } from "typeorm";

import { Router } from "src/router";
import { Server } from "src/server/Server";
import { ConnectionManagerController } from "src/server/ConnectionManagerController";
import { ConnectionManager } from "src/server/ConnectionManager";
import {
	ControllerList,
	IMySqlConnection,
	IPostgresConnection,
	IRoutes
} from "src/types";

jest.mock("express");
jest.mock("typeorm");

jest.mock("../../src/router/Router.ts");
jest.mock("../../src/server/ConnectionManagerController.ts");
jest.mock("../../src/server/ConnectionManager.ts");

jest.mock("@intellion/arche", () => ({
	Chain: class MockChain {
		initially = jest.fn().mockReturnThis();
		before = jest.fn().mockReturnThis();
		main = jest.fn().mockReturnThis();
	}
}));

describe("Server: ", () => {
	let uut: Server;
	const defaultPort = "8000";

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
				expect.assertions(2);
				uut._attachMiddleware(middleware);

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
			const dtos = {};

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
				uut._attachRouter({ routes, controllers, dtos });
				expect(Router).toHaveBeenCalledWith(routes, controllers, dtos);
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

			const mockControllerYield = {
				success: true,
				data: mockConnectionManager,
				errors: []
			};

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
					expect(uut.yield).toEqual(mockControllerYield);
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
					expect(uut.yield).toEqual(mockControllerYield);
					expect(mockServerListen).toHaveBeenCalledWith(defaultPort, boundCallback);
					expect(mockCallback).toHaveBeenCalledWith(uut, defaultPort);
				});
			});
		});

		describe("_createConnectionManager", () => {
			it("should create a Connection Manager and set 'ConnectionManagerController' instance accordingly", () => {
				uut._createConnectionManager();
				expect(ConnectionManager).toHaveBeenCalled();
				expect(uut.connectionManager).toBeInstanceOf(ConnectionManager);
				expect(ConnectionManagerController.connectionManager).toBeInstanceOf(
					ConnectionManager
				);
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

			const mockReturnedConnection = {};

			let mockCreate: jest.Mock;
			let mockEstablishConnection: jest.Mock;
			let mockUseDataSource: jest.Mock;

			beforeEach(() => {
				mockCreate = jest.fn().mockReturnValueOnce(mockReturnedConnection);
				mockEstablishConnection = jest.fn();
				uut._establishConnection = mockEstablishConnection;
				mockUseDataSource = jest.fn();

				Object.assign(mockEntity1, { useDataSource: mockUseDataSource });
				Object.assign(mockEntity2, { useDataSource: mockUseDataSource });
				Object.assign(ConnectionManager.prototype, {
					create: mockCreate
				});

				uut._createConnectionManager();
			});

			afterEach(() => {
				jest.restoreAllMocks();
			});

			it("should create a new connection instance", async () => {
				await uut._createConnection(connectionName, dbConfig);
				expect(mockCreate).toHaveBeenCalledWith(connectionName, dbConfig);
				expect(mockUseDataSource).toHaveBeenNthCalledWith(1, mockReturnedConnection);
				expect(mockUseDataSource).toHaveBeenNthCalledWith(2, mockReturnedConnection);
				expect(mockEstablishConnection).toHaveBeenCalledWith(mockReturnedConnection);
			});
		});

		describe("_establishConnection", () => {
			const mockConnection = { initialize: null } as typeorm.DataSource;
			let mockInitialize: jest.Mock;
			const mockResolvedConnection = {};

			beforeEach(() => {
				mockInitialize = jest.fn().mockResolvedValueOnce(mockResolvedConnection);
				mockConnection.initialize = mockInitialize;
			});

			it("should call 'initialize' method of the connection", async () => {
				await uut._establishConnection(mockConnection);
				expect(mockInitialize).toHaveBeenCalled();
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

		describe("useMySql", () => {
			const connectionName = "some-connection-name";
			const dbConfig = { some: "config" } as unknown as IMySqlConnection;
			let boundCreateConnection: jest.Mock;

			beforeEach(() => {
				boundCreateConnection = jest.fn();
				uut._createConnection.bind = jest.fn().mockReturnValue(boundCreateConnection);
			});

			it("should set a before hook with '_createConnection'", () => {
				const result = uut.useMySql(connectionName, dbConfig);
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
			const dtos = {};

			const routes = {} as IRoutes;
			const controllers = {} as ControllerList;

			let boundAttachRouter: jest.Mock;
			beforeEach(() => {
				boundAttachRouter = jest.fn();
				uut._attachRouter.bind = jest.fn().mockReturnValue(boundAttachRouter);
			});

			it("should set a before hook with '_attachRouter'", () => {
				const result = uut.useRouter(routes, controllers, dtos);
				expect(uut._attachRouter.bind).toHaveBeenCalledWith(uut, {
					routes,
					controllers,
					dtos
				});
				expect(uut.before).toHaveBeenCalledWith(boundAttachRouter);
				expect(result).toBe(uut);
			});
		});
	});
});
