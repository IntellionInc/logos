import http from "http";
import { config } from "dotenv";
import express from "express";
import { ConnectionManager, ConnectionOptions } from "typeorm";
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

	_serve = async () => {
		try {
			const port = process.env.PORT || 8080;
			await this.server.listen(port, () => {
				console.log(`App running on port: ${port}`);
			});
			this.yield = this.connectionManager;
		} catch (error) {
			throw error;
		}
	};

	_createConnectionManager = () => {
		this.connectionManager = new ConnectionManager();
		ConnectionManagerController.connectionManager = this.connectionManager;
	};

	_createConnection = (connectionName: string, dbConfig: ConnectionOptions) =>
		this.connectionManager.create({ name: connectionName, ...dbConfig });

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
