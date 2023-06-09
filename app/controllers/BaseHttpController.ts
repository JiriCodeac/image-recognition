import {Request, Router} from "express";
import BaseController from "./BaseController";

export default abstract class BaseHttpController extends BaseController {
	abstract register(router: Router): void;

	protected canDelete(request: Request): boolean {
		if (this.getUserName(request) == 'michal') {
			return true;
		}

		return false;
	}

	protected getUserName(request: Request): string {
		//@ts-ignore
		const auth = request.auth as {
			user: string,
		};

		return auth.user;
	}
}
