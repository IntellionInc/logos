import { BaseInterceptor } from ".";

export class AuthInterceptor extends BaseInterceptor {
	protocol = this.controller.authProtocol;
	failureStatus = 401;
	failureMessage = "Unauthorized";
}

export class ValidationInterceptor extends BaseInterceptor {
	protocol = this.controller.validationProtocol;
	failureStatus = 400;
	failureMessage = "Invalid arguments";
}
