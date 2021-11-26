export type ResponseHeader = [string, string | string[]];

export interface IRoutes {
	[key: string]: string | IRoutes;
}

export type MethodEnum = "get" | "post" | "patch" | "put" | "delete";
