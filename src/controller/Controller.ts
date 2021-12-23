import { Chain, HookError } from "@intellion/arche";
import { Request, Response } from "express";
import { BaseInterceptor, AuthInterceptor } from "./interceptors";
import { BaseSerializer } from "./serializers";

export class BaseController extends Chain {
	status = 200;
	meta: Record<any, any> = {};
	_interception: string | null = null;

	public user: any;
	public interceptors: BaseInterceptor[] = [];

	public Serializer = BaseSerializer;

	public _controlledFunction: any;
	public _controlledResult: any;
	public _serializedResult: Record<any, any>;

	public static _errorsDictionary = {};
	public _errorsDictionary = {};

	static assignErrors = (klass, newErrorAssignments) => {
		Object.assign(klass._errorsDictionary, newErrorAssignments);
	};
	assignErrors = newErrorAssignments => {
		Object.assign(this._errorsDictionary, newErrorAssignments);
	};

	constructor(public request: Request, public response: Response) {
		super();
		this._setupInterceptors();
		this.main(this._control)
			.finally(this._setStatus)
			.finally(this._setYield)
			.finally(this._respond);
	}

	one = this;
	and = this;

	responseProtocol = async (): Promise<any> =>
		this.status >= 200 && this.status < 300
			? {
					status: this.status,
					meta: this.meta,
					data: this.yield
			  }
			: {
					status: this.status,
					meta: this.meta,
					...this.yield
			  };

	authProtocol = async () => ({
		success: true,
		data: "Default Auth Protocol"
	});

	validationProtocol = async () => ({
		success: true,
		data: "Default Validation Protocol"
	});

	controls = (functionName: string) => {
		this._controlledFunction = this[functionName as keyof BaseController];
		return this;
	};

	authenticates = () => {
		this._setAuthInterceptors();
		return this;
	};

	serializes = () => {
		this._setSerializers();
		return this;
	};

	_setAuthInterceptors = () => {
		this.before(new AuthInterceptor(this).exec);
		return this;
	};

	_setSerializers = () => {
		this.after(this._serialize);
		return this;
	};

	_setupInterceptors = () => {
		if (this.interceptors.length === 0) return;
		this.interceptors.forEach(interceptor => this.before(interceptor.exec));
	};

	_control = async () => {
		const result = await this._controlledFunction(this.request);

		this._controlledResult = result;
	};

	_serialize = async () => {
		let result: any;
		try {
			this._serializedResult = result = await BaseSerializer.serialize(
				this.Serializer,
				this._controlledResult.data ?? this._controlledResult
			);
		} catch (error: any) {
			this._serializedResult = result = {
				success: false,
				error: error.message,
				stack: error.stack
			};
		}
		if (result && result.success === false) this.status = 500;
	};

	_setYield = () =>
		(this.yield = this._interception || this._serializedResult || this._controlledResult);

	_respond = async () => {
		this.response.send(await this.responseProtocol());
	};

	_setStatus = async () => this.response.status(this.status);
	_setInternalError = error => {
		this.status = 500;
		this._controlledResult = { error: error.message, stack: error.stack };
	};

	errorHandler = async hookError => {
		console.log("ATTEMPTING HANDLE");
		console.log(hookError);
		try {
			await hookError.handle();
		} catch (error) {
			console.log(error);
			const KnownError = this._errorsDictionary[error.name];
			if (!KnownError) {
				this.status = 500;
				this._controlledResult = { error: error.message, stack: error.stack };
			}
			if (KnownError) {
				const knownError = new KnownError(error.message);
				if (error.hasOwnProperty("handle")) return await this.errorHandler(knownError);
				this.status = knownError.status;
				this._controlledResult = { error: knownError.message, stack: error.stack };
			}
		}
	};
}
