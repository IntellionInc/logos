import { Chain } from "@intellion/arche";
import { Request, Response } from "express";
import { BaseInterceptor, AuthInterceptor } from "./interceptors";
import { BaseSerializer } from "./serializers";
export abstract class BaseController extends Chain {
	status = 200;
	_interception: string | null = null;

	public user: any;
	public interceptors: BaseInterceptor[] = [];

	public Serializer = BaseSerializer;

	public _controlledFunction: any;
	public _controlledResult: { success: boolean; data?: any; error?: string; stack?: any };
	public _serializedResult: Record<any, any>;
	constructor(public request: Request, public response: Response) {
		super();

		this.initially(this._setupInterceptors)
			.main(this._control)
			.finally(this._setStatus)
			.finally(this._respond);
	}

	one = this;

	authProtocol = async () => true;

	validationProtocol = async () => ({
		success: true,
		data: "Default Validation Protocol"
	});

	controls = (functionName: string) => {
		this._controlledFunction = this[functionName as keyof BaseController];
		return this;
	};

	serializes = () => this.after(this._serialize);

	authenticates = () => this.interceptors.push(new AuthInterceptor(this));

	_setupInterceptors = () => {
		if (this.interceptors.length === 0) return;
		this.interceptors.forEach(interceptor => this.before(interceptor.exec));
	};

	_control = async () => {
		let result: any;
		try {
			result = await this._controlledFunction(this.request);
		} catch (error: any) {
			result = { success: false, error: error.message, stack: error.stack };
		}

		if (result && result.success === false) this.status = 500;
		this._controlledResult = result;
	};

	_serialize = async () => {
		let result: any;
		try {
			this._serializedResult = result = await BaseSerializer.serialize(
				this.Serializer,
				this._controlledResult.data
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

	_respond = async () => this.response.send(this._interception || this._serializedResult);

	_setStatus = async () => this.response.status(this.status);
}
