export type CommunicatorMethodName = "get" | "post" | "put" | "patch" | "delete";
export type CommunicatorMethod = (
	url: string,
	params?: Record<string, any>
) => Promise<any>;

export interface HttpRequestArgs {
	baseURL: string;
	timeout: number;
	headers?: Record<string, string>;
}

export type ErrorHandler = (...args: any) => any;
