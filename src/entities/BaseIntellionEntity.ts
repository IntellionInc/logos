import { ConnectionManagerController } from "src/server";
import { BaseEntity, Connection } from "typeorm";

export class BaseIntellionEntity extends BaseEntity {
	connectionName = "default";
	connection: Connection;
	constructor() {
		super();
		this.connection = ConnectionManagerController.connectionManager[this.connectionName];
		BaseIntellionEntity.useConnection(this.connection);
	}
}
