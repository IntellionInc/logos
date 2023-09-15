import { Chain, Hook } from "@intellion/arche";
import { Request, Response } from "express";

import { STATUS } from "./StatusCodes";
import { BaseInterceptor, AuthInterceptor, ValidationInterceptor } from "./interceptors";
import { BaseSerializer } from "./serializers";
import { ControllerResponse, IControllerDtos } from "../types";

export class BaseController extends Chain {
	status = STATUS.SUCCESS;
	meta: Record<any, any> = {};
	_interception: any = null;

	static MIDDLEWARES: any[] = [];

	public user: any;
	public interceptors: BaseInterceptor[] = [];

	public Serializer = BaseSerializer;
	public dtos: IControllerDtos = { body: null };

	public _controlledFunction: any;

	public _controlledResult: any;
	public _serializedResult: Record<any, any>;
	public responseData: any;

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

	authProtocol = async () => {
		return await {
			success: true,
			data: "Default Auth Protocol"
		};
	};

	authenticates = () => {
		this._setAuthentication();
		return this;
	};

	async responseProtocol() {
		return (await this.#isSuccessfulResponseStatus())
			? this.#sendSuccessResponse()
			: this.#sendFailureResponse();
	}

	serializes = () => {
		this._setSerialization();
		return this;
	};

	validationProtocol = async (): Promise<unknown> => ({
		success: true,
		data: "Default Validation Protocol"
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

	async errorHandler(hook: Hook) {
		await super.errorHandler(hook);
		try {
			await hook.error.handle();
		} catch (error) {
			if (!error) error = new Error();
			const KnownError = this._errorsDictionary[error.name];
			if (!KnownError) this.#setInternalError(error);
			if (KnownError) {
				const knownError = new KnownError(error.message);
				if (knownError.hasOwnProperty("handle")) {
					hook.error = knownError;
					return await this.errorHandler(hook);
				}
				this.status = knownError.status;
				this._controlledResult = { error: knownError, stack: error.stack };
			}
		}
	}

	_setInterceptors = () => {
		if (this.interceptors.length === 0) return;
		this.interceptors.forEach(interceptor => this.before(interceptor.exec));
	};

	_control = async () => {
		const result = await this._controlledFunction(this.request);
		return (this._controlledResult = result);
	};

	_setStatus = async () => this.response.status(this.status);

	_setResponseData = () =>
		(this.responseData =
			this._interception || this._serializedResult || this._controlledResult);

	_respond = async () => {
		this.response.send(await this.responseProtocol());
	};

	_setAuthentication = () => {
		this.before(new AuthInterceptor(this).exec);
		return this;
	};

	_serialize = async () => {
		let result: any;
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

	#setInternalError = error => {
		if (this.status === STATUS.SUCCESS) this.status = STATUS.INTERNAL_SERVER_ERROR;
		this._controlledResult = { error, stack: error.stack };
	};

	#sendSuccessResponse = (): ControllerResponse => ({
		status: this.status,
		meta: this.meta,
		data: this.responseData,
		error: null
	});

	#sendFailureResponse = (): ControllerResponse => ({
		status: this.status,
		meta: this.meta,
		error: this.responseData,
		data: null
	});

	#isSuccessfulResponseStatus = () => this.status >= 200 && this.status < 300;

	#setSerializedResult = async () => {
		const data = this._controlledResult.data ?? this._controlledResult;
		return await BaseSerializer.serialize(this.Serializer, data);
	};

	#setSerializationError = (error: Error) => ({
		success: false,
		error,
		stack: error.stack
	});

	#setStatusToFailed = () => (this.status = STATUS.INTERNAL_SERVER_ERROR);
}
