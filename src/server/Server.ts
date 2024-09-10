import http from "http";
import { config } from "dotenv";
import express from "express";
import { BaseEntity, DataSource } from "typeorm";
import { Chain } from "@intellion/arche";
import { Router } from "../router";
import {
	ControllerList,
	IRoutes,
	IPostgresConnection,
	DtoList,
	IMySqlConnection,
	IConnection
} from "../types";
import { ConnectionManagerController } from "./ConnectionManagerController";
import { ConnectionManager } from "./ConnectionManager";

config();

export class Server extends Chain {
	connectionInfo: { name: string; connectionOptions: IConnection };

	app = express();
	server: http.Server;

	connectionManager: ConnectionManager;
	defaultPort = "8000";

	constructor() {
		super();
		this.initially(this._createConnectionManager)
			.initially(this._createServer)
			.main(this._serve);
	}

	_createServer = () => {
		this.server = new http.Server(this.app);
	};

	_attachMiddleware = (middleware: ((...args: any[]) => any)[]) => {
		middleware.forEach(method => this.app.use(method));
	};

	_attachRouter = ({
		routes,
		controllers,
		dtos
	}: {
		routes: IRoutes;
		controllers: ControllerList;
		dtos: DtoList;
	}) => {
		this.app.use(new Router(routes, controllers, dtos).map());
	};

	_onListenCallback = (port: string) => {
		console.log(`App running on port: ${port}`);
	};

	_serve = async () => {
		const port = process.env.PORT || this.defaultPort;
		await this.server.listen(port, this._onListenCallback.bind(this, port));
		this.yield = { success: true, data: this.connectionManager, errors: [] };
	};

	_createConnectionManager = () => {
		this.connectionManager = new ConnectionManager();
		ConnectionManagerController.connectionManager = this.connectionManager;
	};

	_createConnection = async (connectionName: string, dbConfig: IConnection) => {
		const connection = this.connectionManager.create(connectionName, dbConfig);

		dbConfig.entities.forEach((Entity: typeof BaseEntity) => {
			Entity.useDataSource(connection);
		});
		await this._establishConnection(connection);
	};

	_establishConnection = async (connection: DataSource) => {
		await connection.initialize();
	};

	_addConnectionHook = (connectionName: string, dbConfig: IConnection) => {
		this.before(this._createConnection.bind(this, connectionName, dbConfig));
		return this;
	};

	usePostgres = (connectionName: string, dbConfig: IPostgresConnection) =>
		this._addConnectionHook(connectionName, dbConfig);

	useMySql = (connectionName: string, dbConfig: IMySqlConnection) =>
		this._addConnectionHook(connectionName, dbConfig);

	useMiddleware = (middleware: ((...args: any[]) => any)[]) => {
		this.before(this._attachMiddleware.bind(this, middleware));
		return this;
	};

	useRouter = (routes: IRoutes, controllers: ControllerList, dtos: DtoList) => {
		this.before(this._attachRouter.bind(this, { routes, controllers, dtos }));
		return this;
	};
}
