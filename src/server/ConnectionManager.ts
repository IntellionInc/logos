import { IConnection } from "../types";
import { DataSource } from "typeorm";

export class ConnectionManager {
	private connectionDictionary: { [key: string]: DataSource } = {};

	create = (connectionName: string, dbConfig: IConnection) => {
		const connection = new DataSource({ name: connectionName, ...dbConfig });
		Object.assign(this.connectionDictionary, { [connectionName]: connection });
		return connection;
	};

	get = (connectionName: string) => this.connectionDictionary[connectionName];
}
