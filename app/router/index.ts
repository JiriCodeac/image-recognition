import {ContainerBuilder} from 'node-dependency-injection';
import {Router as ExpressRouter} from 'express';

const controllers = [
	'setupController',
	'healthCheckController',
	'dashboardController',
	'detectionsController',
	'bestFramesController',
	'frameController',
	'imageController',
];

export default class Router {
	restRouter: ExpressRouter;

	constructor(container: ContainerBuilder) {
		this.restRouter = ExpressRouter();

		controllers.forEach((controller: string) => {
			container.get(controller).register(this.restRouter);
		});
	}

	getRestRouter(): ExpressRouter {
		return this.restRouter;
	}
}
