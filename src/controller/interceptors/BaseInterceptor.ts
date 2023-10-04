import { Chain } from "@intellion/arche";
import { BaseController } from "../Controller";

export abstract class BaseInterceptor extends Chain {
	protocol: (...args: any[]) => Promise<{
		success: boolean;
		data: string | null;
		errors: Error[];
	}>;
	failureStatus: number;
	failureMessage: () => string;
	data: string;
	errors: Error[] = [];
	success = true;

	constructor(public controller: BaseController) {
		super();
		this.main(this.runProtocol)
			.finally(this.setControllerStatus)
			.finally(this.setControllerInterception)
			.finally(this.setYield);
	}

	runProtocol = async () => {
		const result = await this.protocol();
		const { success, data, errors } = result;
		[this.success, this.data] = [success, data];
		if (errors) this.errors.push(...errors);
	};

	setControllerStatus = () => {
		if (!this.success) this.controller.status = this.failureStatus;
	};

	setControllerInterception = () => {
		if (!this.success) this.controller._interception = this.failureMessage();
	};

	setYield = () => {
		this.yield = { success: this.success, data: this.data, errors: this.errors };
	};
}
