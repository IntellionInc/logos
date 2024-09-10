import { ConnectionManagerController } from "../server";
import { BaseEntity, DataSource } from "typeorm";

export class BaseIntellionEntity extends BaseEntity {
	connectionName = "default";
	connection: DataSource;
	constructor() {
		super();
		this.connection = ConnectionManagerController.connectionManager.get(
			this.connectionName
		);
		BaseIntellionEntity.useDataSource(this.connection);
	}
}
