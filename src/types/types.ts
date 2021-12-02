import { Request, Response } from "express";
import { BaseEntity } from "typeorm";
import { BaseController } from "../controller";

export type ControllerType = {
	new (request: Request, response: Response): BaseController;
};

export type EntityType = {
	new (): BaseEntity;
};

export type ControllerList = Record<string, ControllerType>;

export type ResponseHeader = [string, string | string[]];
export interface IRoutes {
	[key: string]: string | IRoutes;
}

export interface IPostgresConnection {
	type: "postgres";
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
	entities: EntityType[];
}

export type MethodEnum = "get" | "post" | "patch" | "put" | "delete";
