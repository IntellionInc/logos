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
		return this.errors.length > 0
			? this.errors.map(({ message }) => message).join(", ")
			: ERROR_MESSAGES.BAD_REQUEST;
	};
}
