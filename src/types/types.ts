import { BaseEntity } from "typeorm";
import { BaseController, BaseDto } from "../controller";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
import { SqlServerConnectionOptions } from "typeorm/driver/sqlserver/SqlServerConnectionOptions";

export interface EntityType {
	new (): BaseEntity;
}

export interface ControllerList {
	[key: string]: typeof BaseController;
}
export interface DtoList {
	[key: string]: {
		[key: string]:
			| typeof BaseDto
			| {
					[key: string]: typeof BaseDto;
			  };
	};
}

export interface IControllerDtos {
	body: typeof BaseDto;
	[key: string]: typeof BaseDto;
}

export interface IDtoInput {
	[key: string]: any;
}
export interface ISerializerInput {
	[key: string]: any;
}

export interface ISerializerOutput {
	[key: string]: any;
}

export type ResponseHeader = [string, string | string[]];
export interface IRoutes {
	[key: string]: string | IRoutes;
}

export interface IPostgresConnection extends PostgresConnectionOptions {
	type: "postgres";
	url: string;
	entities: EntityType[];
}

export interface IMySqlConnection extends MysqlConnectionOptions {
	type: "mysql";
	url: string;
	entities: EntityType[];
}

export interface IMsSqlConnection extends SqlServerConnectionOptions {
	type: "mssql";
	url: string;
	entities: EntityType[];
}

export type IConnection = IPostgresConnection | IMySqlConnection | IMsSqlConnection;

export type CrudMethodName = "get" | "post" | "patch" | "put" | "delete";

export interface CommunicatorMethod {
	(url: string, params?: Record<string, any>): Promise<any>;
}
export interface HttpRequestArgs {
	baseURL: string;
	timeout: number;
	headers?: Record<string, string>;
}

export interface ErrorHandler {
	(...args: any): any;
}

export type SerializerFieldStatus = "getter" | "allowed" | "optional";

export type ControllerResponse = {
	status: number;
	meta: Record<any, any>;
	error: string;
	stack?: string;
	data: Record<any, any>;
	count?: number;
	paginated?: boolean;
};
