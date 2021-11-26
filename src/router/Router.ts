import express, { IRouter } from "express";
import { BaseController } from "../controller";
import { MethodEnum } from "../types";

export class Router {
	routes: any;
	controllers: any;
	constructor(routes: any, controllers: BaseController[]) {
		Object.assign(this, { routes, controllers });
	}

	map = () => this._map(this.routes);

	_map = (layer: any) => {
		const router = express.Router({ mergeParams: true });
		if (this.isDeepestLayer(layer)) return this.route(router, layer);
		return this.use(router, layer);
	};

	isDeepestLayer = (layer: any) =>
		Object.values(layer).every(item => typeof item === "string");

	route = (router: IRouter, layer: any) => {
		Object.keys(layer).forEach(key => {
			if (typeof layer[key] === "string") {
				router.route("/");
				const matcher = layer[key].split(" => ");
				router.route("/")[key as MethodEnum](this.methodGetter.bind(this, matcher));
			}
		});
		return router;
	};

	methodGetter = async (args: any[], matcher: string[]) => {
		const Controller = this.controllers[matcher[0]];
		const method = matcher[1];

		//exec() or exec ??
		return await new Controller(...args).controls(method).exec();
	};

	use = (router: IRouter, layer: any) => {
		const routedRouter = this.route(router, layer);
		const routersBelow = Object.keys(layer).map(layerKey => {
			return this._map(layer[layerKey]);
		});

		routersBelow.forEach((routerBelow, index) =>
			routedRouter.use(Object.keys(layer)[index], routerBelow)
		);
		return routedRouter;
	};
}
