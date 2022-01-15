import { Chain } from "@intellion/arche";
import { Request, Response } from "express";

import { STATUS } from "./StatusCodes";
import { BaseInterceptor, AuthInterceptor } from "./interceptors";
import { BaseSerializer } from "./serializers";
import { IControllerDtos } from "../types";

export class BaseController extends Chain {
	status = STATUS.SUCCESS;
	meta: Record<any, any> = {};
	_interception: string | null = null;

	public user: any;
	public interceptors: BaseInterceptor[] = [];

	public Serializer = BaseSerializer;
	public dtos: IControllerDtos = { body: null };

	public _controlledFunction: any;

	public _controlledResult: any;
	public _serializedResult: Record<any, any>;

	public static _errorsDictionary = {};
	public _errorsDictionary = {};

	constructor(public request: Request, public response: Response) {
		super();

		this._setInterceptors();
		this.main(this._control)
			.finally(this._setStatus)
			.finally(this._setYield)
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

	responseProtocol = async (): Promise<any> =>
		this.#isSuccessfulResponseStatus()
			? this.#sendSuccessResponse()
			: this.#sendFailureResponse();

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

	errorHandler = async hookError => {
		try {
			await hookError.handle();
		} catch (error) {
			const KnownError = this._errorsDictionary[error.name];
			if (!KnownError) this.#setInternalError(error);
			if (KnownError) {
				const knownError = new KnownError(error.message);
				if (knownError.hasOwnProperty("handle"))
					return await this.errorHandler(knownError);
				this.status = knownError.status;
				this._controlledResult = { error: knownError.message, stack: error.stack };
			}
		}
	};

	_setInterceptors = () => {
		if (this.interceptors.length === 0) return;
		this.interceptors.forEach(interceptor => this.before(interceptor.exec));
	};

	_control = async () => {
		const result = await this._controlledFunction(this.request);
		this._controlledResult = result;
	};

	_setStatus = async () => this.response.status(this.status);

	_setYield = () =>
		(this.yield = this._interception || this._serializedResult || this._controlledResult);

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

	_validate = async () => this.validationProtocol();

	_setValidation = () => {
		this.before(this._validate);
		return this;
	};

	#setInternalError = error => {
		if (this.status === STATUS.SUCCESS) this.status = STATUS.INTERNAL_SERVER_ERROR;
		this._controlledResult = { error: error.message, stack: error.stack };
	};

	#sendSuccessResponse = () => ({
		status: this.status,
		meta: this.meta,
		data: this.yield
	});

	#sendFailureResponse = () => ({
		status: this.status,
		meta: this.meta,
		...this.yield
	});

	#isSuccessfulResponseStatus = () => this.status >= 200 && this.status < 300;

	#setSerializedResult = async () => {
		const data = this._controlledResult.data ?? this._controlledResult;
		return await BaseSerializer.serialize(this.Serializer, data);
	};

	#setSerializationError = (error: Error) => ({
		success: false,
		error: error.message,
		stack: error.stack
	});

	#setStatusToFailed = () => (this.status = STATUS.INTERNAL_SERVER_ERROR);
}
