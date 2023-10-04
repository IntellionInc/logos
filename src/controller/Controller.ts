import { Chain } from "@intellion/arche";
import { Request, Response } from "express";
import { STATUS } from "./StatusCodes";
import { BaseInterceptor } from "./interceptors/BaseInterceptor";
import {
	AuthInterceptor,
	ValidationInterceptor
} from "./interceptors/DerivedInterceptors";
import { BaseSerializer } from "./serializers/BaseSerializer";
import { ControllerResponse, IControllerDtos } from "../types";

interface IControllerResult {
	data: {
		[key: string]: any;
		count?: number;
		paginated?: boolean;
	} | null;
	success: boolean;
	error?: string;
	stack?: string;
}
export class BaseController extends Chain {
	status = STATUS.SUCCESS;
	meta: Record<string, any> = {};
	_interception: any = null;

	count?: number;
	paginated?: boolean;

	static MIDDLEWARES: any[] = [];

	public user: any;
	public interceptors: BaseInterceptor[] = [];

	public Serializer = BaseSerializer;
	public dtos: IControllerDtos = { body: null };

	public _controlledFunction: any;

	private errorMessage = "";

	public _controlledResult: IControllerResult;

	public _serializedResult: IControllerResult;

	public responseData: {
		data: Record<string, any>;
		count?: number;
		paginated?: boolean;
		error?: string;
	};

	public static _errorsDictionary = {};
	public _errorsDictionary = {};

	constructor(public request: Request, public response: Response) {
		super();

		this._setInterceptors();
		this.main(this._control)
			.finally(this._setStatus)
			.finally(this._setResponseData)
			.finally(this._respond);
	}

	one = this;
	and = this;

	controls = (functionName: string) => {
		this._controlledFunction = this[functionName as keyof BaseController];
		return this;
	};

	authProtocol = async <T>(): Promise<{
		data: T | string;
		success: boolean;
		errors: Error[];
	}> => {
		return {
			success: true,
			data: "Default Auth Protocol",
			errors: []
		};
	};

	authenticates = () => {
		this._setAuthentication();
		return this;
	};

	async responseProtocol() {
		const response = this.#isSuccessfulResponseStatus()
			? this.#sendSuccessResponse()
			: this.#sendFailureResponse();

		if (process.env.NODE_ENV === "production" && !!response.stack) delete response.stack;
		return response;
	}

	serializes = () => {
		this._setSerialization();
		return this;
	};

	validationProtocol = async <T>(): Promise<{
		data: T | string;
		success: boolean;
		errors: Error[];
	}> => ({
		success: true,
		data: "Default Validation Protocol",
		errors: []
	});

	validates = () => {
		this._setValidation();
		return this;
	};

	static assignErrors = (klass, newErrorAssignments) => {
		Object.assign(klass._errorsDictionary, newErrorAssignments);
	};

	assignErrors = newErrorAssignments => {
		Object.assign(this._errorsDictionary, newErrorAssignments);
	};

	async errorHandler(error: Error & { status?: number }): Promise<void> {
		await super.errorHandler(error);
		if (!error) error = new Error();
		if (error.status) this.status = error.status;

		const KnownError = this._errorsDictionary[error.name];
		if (!KnownError) return this.#setInternalError(error);

		const knownError = new KnownError(error.message);
		this.status = knownError.status;
		this._controlledResult = {
			data: null,
			success: false,
			error: knownError.message,
			stack: error.stack
		};
	}

	_setInterceptors = () => {
		if (this.interceptors.length === 0) return;
		this.interceptors.forEach(interceptor => this.before(interceptor.exec));
	};

	_control = async (): Promise<{
		data: Record<any, any>;
		count?: number;
		paginated?: boolean;
	}> => {
		const result = await this._controlledFunction(this.request);
		this.count = result?.count;
		this.paginated = result?.paginated;
		return (this._controlledResult = result);
	};

	_setStatus = async () => this.response.status(this.status);

	_setResponseData = async () => {
		if (this._interception) {
			this.responseData = {
				data: null,
				count: this.count,
				paginated: this.paginated,
				error: this._interception
			};
			return;
		}
		let result = this._controlledResult;
		if (this._serializedResult && !this._controlledResult.error)
			result = this._serializedResult;
		this.responseData = result;
	};

	_respond = async () => {
		this.response.send(await this.responseProtocol());
	};

	_setAuthentication = () => {
		this.before(new AuthInterceptor(this).exec);
		return this;
	};

	_serialize = async () => {
		let result: any;
		if (this._controlledResult && this._controlledResult.error) return;
		try {
			this._serializedResult = result = await this.#setSerializedResult();
		} catch (error) {
			this._serializedResult = result = this.#setSerializationError(error);
		}
		if (result && result.success === false) this.#setStatusToFailed();
	};

	_setSerialization = () => {
		this.after(this._serialize);
		return this;
	};

	_setValidation = () => {
		this.before(new ValidationInterceptor(this).exec);
		return this;
	};

	_validate = async () => this.validationProtocol();

	#setInternalError = (error: Error) => {
		if (this.status === STATUS.SUCCESS) this.status = STATUS.INTERNAL_SERVER_ERROR;
		this._controlledResult = {
			data: null,
			success: false,
			error: error.message,
			stack: error.stack
		};
	};

	#sendSuccessResponse = (): ControllerResponse => ({
		...this.responseData,
		status: this.status,
		meta: this.meta,
		error: null
	});

	#sendFailureResponse = (): ControllerResponse => ({
		...this.responseData,
		status: this.status,
		meta: this.meta,
		error: this.responseData?.error ?? this.errorMessage
	});

	#isSuccessfulResponseStatus = () => this.status >= 200 && this.status < 300;

	#setSerializedResult = async (): Promise<{
		data: Record<string, any>;
		count?: number;
		paginated?: boolean;
		success: boolean;
	}> => {
		const serializerInput =
			this._controlledResult && this._controlledResult.data
				? this._controlledResult.data
				: this._controlledResult;
		const serializedData = await BaseSerializer.serialize(
			this.Serializer,
			serializerInput
		);

		return {
			data: serializedData,
			count: this.count,
			paginated: this.paginated,
			success: true
		};
	};

	#setSerializationError = (error: Error) => ({
		data: null,
		success: false,
		error: error.message,
		stack: error.stack
	});

	#setStatusToFailed = () => (this.status = STATUS.INTERNAL_SERVER_ERROR);
}
