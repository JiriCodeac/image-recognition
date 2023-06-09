import {Request, Response, Router} from 'express';
import {Sequelize} from 'sequelize-typescript';
import BaseHttpController from "./BaseHttpController";

export default class SetupController extends BaseHttpController {

	constructor(private readonly database: Sequelize) {
		super();
	}

	register(router: Router): void { // eslint-disable-line no-unused-vars
		router.route('/v1/setup').get((request: Request, response: Response) => {
			return this.actionSetup(request, response);
		});
	}

	/**
	 * @route GET /setup
	 */
	async actionSetup(request: Request, response: Response): Promise<any> {
		const tables = await this.database.showAllSchemas({});

		if (tables.length === 0) {
			await this.database.sync();
			response.status(201).json();
		} else {
			return response.status(404).json();
		}
	}
}
