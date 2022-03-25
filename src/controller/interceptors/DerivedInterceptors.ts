import { BaseInterceptor } from "./BaseInterceptor";
import { STATUS, ERROR_MESSAGES } from "../StatusCodes";

export class AuthInterceptor extends BaseInterceptor {
	protocol = this.controller.authProtocol;
	failureStatus = STATUS.UNAUTHORIZED;
	failureMessage = () => ERROR_MESSAGES.UNAUTHORIZED;
}

export class ValidationInterceptor extends BaseInterceptor {
	protocol = this.controller.validationProtocol;
	failureStatus = STATUS.BAD_REQUEST;
	failureMessage = () => {
		return this.error ? this.error.message : ERROR_MESSAGES.BAD_REQUEST;
	};
}
