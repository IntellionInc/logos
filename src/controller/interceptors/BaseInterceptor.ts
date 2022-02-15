import { Chain } from "@intellion/arche";
import { BaseController } from "../Controller";

export abstract class BaseInterceptor extends Chain {
	protocol: (...args: any[]) => any;
	failureStatus: number;
	failureMessage: string;
	data: string;
	error?: any;
	success = true;

	constructor(public controller: BaseController) {
		super();
		this.main(this.runProtocol)
			.finally(this.setControllerStatus)
			.finally(this.setControllerInterception)
			.finally(this.setYield);
	}

	runProtocol = async () => {
		const { success, data, error } = await this.protocol();
		[this.success, this.data, this.error] = [success, data, error];
	};

	setControllerStatus = () => {
		if (!this.success) this.controller.status = this.failureStatus;
	};

	setControllerInterception = () => {
		if (!this.success) this.controller._interception = this.failureMessage;
	};

	setYield = () => {
		this.yield = { success: this.success, data: this.data, error: this.error };
	};
}
