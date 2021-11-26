import { Chain } from "@intellion/arche";
import { BaseController } from "../Controller";

export abstract class BaseInterceptor extends Chain {
	protocol: (...args: any[]) => any;
	failureStatus: number;
	failureMessage: string;
	success = true;

	constructor(public controller: BaseController) {
		super();
		this.main(this.runProtocol)
			.finally(this.setControllerStatus)
			.finally(this.setControllerInterception)
			.finally(this.setYield);
	}

	runProtocol = async () => (this.success = await this.protocol());

	setControllerStatus = () => {
		if (!this.success) this.controller.status = this.failureStatus;
	};

	setControllerInterception = () => {
		if (!this.success) this.controller._interception = this.failureMessage;
	};

	setYield = () => {
		this.yield = { success: this.success };
	};
}
