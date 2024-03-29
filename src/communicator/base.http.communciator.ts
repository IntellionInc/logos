import axios, { AxiosInstance } from "axios";
import {
	CommunicatorMethod,
	CrudMethodName,
	ErrorHandler,
	HttpRequestArgs
} from "../types";

export class BaseHTTPCommunicator {
	axios: AxiosInstance;

	get: CommunicatorMethod;
	post: CommunicatorMethod;
	put: CommunicatorMethod;
	patch: CommunicatorMethod;
	delete: CommunicatorMethod;

	constructor(args: HttpRequestArgs, errorHandler: ErrorHandler) {
		this.axios = axios.create({
			...args
		});
		const methodOptions: CrudMethodName[] = ["get", "post", "put", "patch", "delete"];
		methodOptions.forEach(
			method =>
				(this[method] = (...args) =>
					this.axios[method](...args)
						.then(({ data }) => data)
						.catch(errorHandler))
		);
	}
}
