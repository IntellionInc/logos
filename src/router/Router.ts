import express, { IRouter, Request, Response } from "express";
import { BaseController } from "../controller";
import { ControllerList, DtoList, IRoutes, CrudMethodName } from "../types";

export class Router {
	Controller: typeof BaseController;
	controller: BaseController;

	constructor(
		public routes: IRoutes,
		public controllers: ControllerList,
		public dtos: DtoList
	) {}

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
				router
					.route("/")
					[<CrudMethodName>key](this.runControllerMethod.bind(this, matcher));
			}
		});
		return router;
	};

	runControllerMethod = async (
		[controllerName, methodName],
		...args: [Request, Response]
	) => {
		this.#attachController(controllerName, ...args);
		this.#attachDto([controllerName, methodName]);
		this.#attachErrors();

		return await this.controller.controls(methodName).x;
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

	#attachController = (controllerName, ...args: [Request, Response]) => {
		this.Controller = this.controllers[controllerName];
		this.controller = new this.Controller(...args);
	};

	#attachDto = ([controllerName, methodName]) => {
		const dto = this.dtos[controllerName]?.[methodName];
		Object.assign(this.controller, { dto });
	};

	#attachErrors = () => this.controller.assignErrors(this.Controller._errorsDictionary);
}
