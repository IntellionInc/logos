import express, { IRouter, Request, Response } from "express";
import { BaseController, BaseDto } from "../controller";
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
				const middlewares = this.controllers[matcher[0]].MIDDLEWARES;
				router
					.route("/")
					[<CrudMethodName>key](
						...middlewares,
						this.runControllerMethod.bind(this, matcher)
					);
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
		const returnedDtos = this.dtos[controllerName]?.[methodName];
		if (returnedDtos == null) return;

		if (this.#isASingleDtoReturned(returnedDtos)) {
			this.#attachDtoToControllerBody(<typeof BaseDto>returnedDtos);
		} else {
			this.#attachDtoListToControllerFields(<Record<string, typeof BaseDto>>returnedDtos);
		}
	};

	#attachErrors = () => this.controller.assignErrors(this.Controller._errorsDictionary);

	#isASingleDtoReturned = (
		returnedDtos: typeof BaseDto | Record<string, typeof BaseDto>
	): boolean => returnedDtos.validate != null;

	#attachDtoToControllerBody = (returnedDto: typeof BaseDto): void => {
		Object.assign(this.controller, { dtos: { body: returnedDto } });
	};

	#attachDtoListToControllerFields = (dtoList: Record<string, typeof BaseDto>): void => {
		Object.keys(dtoList).forEach(key => {
			Object.assign(this.controller, {
				dtos: { ...this.controller.dtos, [key]: dtoList[key] }
			});
		});
	};
}
