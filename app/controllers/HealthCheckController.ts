import {Request, Response, Router} from 'express';
import Version from '../components/Version';
import BaseHttpController from "./BaseHttpController";
import {FtpModel} from "../models/FtpModel";
import {S3Model} from "../models/S3Model";
import Configurator from "../components/Configurator";

export default class HealthCheckController extends BaseHttpController {
	private readonly resultsBucketName: string;

	constructor(
		private readonly version: Version,
		private readonly ftpModel: FtpModel,
		private readonly s3Model: S3Model,
		configurator: Configurator,
	) {
		super();

		this.resultsBucketName = configurator.parameters<string>('s3.buckets.results');
	}

	register(router: Router): void {
		router.route('/v1/health-check').get((request: Request, response: Response) => {
			return this.actionDefault(request, response);
		});
	}

	async actionDefault(request: Request, response: Response): Promise<void> {
		const result = {
			status: 'Healthy :)',
			versionInfo: this.version.getVersion(),
			stable: this.version.isStable(),
			ftp: await this.ftpModel.getStatus(),
			s3Healthy: await this.s3Model.getStatus(this.resultsBucketName),
		};

		response.status(200).json(result);
	}
}
