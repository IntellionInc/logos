import { Request, Response } from "express";
import { BaseController } from "../controller";

export type ControllerType = {
	new (request: Request, response: Response): BaseController;
};
export type ControllerList = Record<string, ControllerType>;

export type ResponseHeader = [string, string | string[]];
export interface IRoutes {
	[key: string]: string | IRoutes;
}

export type MethodEnum = "get" | "post" | "patch" | "put" | "delete";
