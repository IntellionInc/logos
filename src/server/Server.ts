import http from "http";
import { config } from "dotenv";
import express from "express";
import { BaseEntity, Connection, ConnectionManager, ConnectionOptions } from "typeorm";
import { Chain } from "@intellion/arche";
import { Router } from "../router";
import { ControllerList, IRoutes, IPostgresConnection } from "../types";
import { ConnectionManagerController } from "./ConnectionManagerController";

config();

export class Server extends Chain {
	connectionInfo: { name: string; connectionOptions: ConnectionOptions };

	app = express();
	server: http.Server;

	connectionManager: ConnectionManager;
	defaultPort = "5432";

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
		controllers
	}: {
		routes: IRoutes;
		controllers: ControllerList;
	}) => {
		this.app.use(new Router(routes, controllers).map());
	};

	_onListenCallback = (port: string) => {
		console.log(`App running on port: ${port}`);
	};

	_serve = async () => {
		const port = process.env.PORT || this.defaultPort;
		await this.server.listen(port, this._onListenCallback.bind(this, port));
		this.yield = this.connectionManager;
	};

	_createConnectionManager = () => {
		this.connectionManager = new ConnectionManager();
		ConnectionManagerController.connectionManager = this.connectionManager;
	};

	_createConnection = async (connectionName: string, dbConfig: ConnectionOptions) => {
		const connection = this.connectionManager.create({
			name: connectionName,
			...dbConfig
		});
		dbConfig.entities.forEach((Entity: typeof BaseEntity) =>
			Entity.useConnection(connection)
		);
		await this._establishConnection(connection);
	};

	_establishConnection = async (connection: Connection) => await connection.connect();

	usePostgres = (connectionName: string, dbConfig: IPostgresConnection) => {
		this.before(this._createConnection.bind(this, connectionName, dbConfig));
		return this;
	};

	useMiddleware = (middleware: ((...args: any[]) => any)[]) => {
		this.before(this._attachMiddleware.bind(this, middleware));
		return this;
	};

	useRouter = (routes: IRoutes, controllers: ControllerList) => {
		this.before(this._attachRouter.bind(this, { routes, controllers }));
		return this;
	};
}
