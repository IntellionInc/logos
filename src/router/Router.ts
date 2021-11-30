import express, { IRouter, Request, Response } from "express";
import { ControllerList, IRoutes, MethodEnum } from "../types";

export class Router {
	routes: IRoutes;
	controllers: ControllerList;
	constructor(routes: IRoutes, controllers: ControllerList) {
		Object.assign(this, { routes, controllers });
	}

	map = () => this._map(this.routes);

	_map = (layer: IRoutes) => {
		const router = express.Router({ mergeParams: true });
		if (this.isDeepestLayer(layer)) return this.route(router, layer);
		return this.use(router, layer);
	};

	isDeepestLayer = (layer: IRoutes) =>
		Object.values(layer).every(item => typeof item === "string");

	route = (router: IRouter, layer: IRoutes) => {
		Object.keys(layer).forEach(key => {
			if (typeof layer[key] === "string") {
				router.route("/");
				const matcher = (<string>layer[key]).split(" => ");
				router.route("/")[key as MethodEnum](this.methodGetter.bind(this, matcher));
			}
		});
		return router;
	};

	methodGetter = async (matcher: [string, string], ...args: [Request, Response]) => {
		const [Controller, method] = [this.controllers[matcher[0]], matcher[1]];
		return await new Controller(...args).controls(method).x;
	};

	use = (router: IRouter, layer: IRoutes) => {
		const routedRouter = this.route(router, layer);
		const routersBelow = Object.keys(layer).map(layerKey => {
			return this._map(<IRoutes>layer[layerKey]);
		});

		routersBelow.forEach((routerBelow, index) =>
			routedRouter.use(Object.keys(layer)[index], routerBelow)
		);
		return routedRouter;
	};
}
