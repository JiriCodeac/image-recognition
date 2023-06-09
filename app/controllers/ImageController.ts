import {Request, Response, Router} from 'express';
import BaseHttpController from "./BaseHttpController";
import {S3Model} from "../models/S3Model";
import Configurator from "../components/Configurator";
import {Logger} from "winston";
import * as stream from "stream";

export default class ImageController extends BaseHttpController {
	private readonly resultsBucketName: string;

	constructor(
		private readonly s3Model: S3Model,
		private readonly logger: Logger,
		configurator: Configurator,
	) {
		super();

		this.resultsBucketName = configurator.parameters<string>('s3.buckets.results');
	}

	register(router: Router): void {
		router.route('/image/:path').get((request: Request, response: Response) => {
			return this.actionDefault(request, response);
		});
	}

	async actionDefault(request: Request, response: Response): Promise<void> {
		const imagePath = request.params?.path;

		response.set('Cache-control', 'public, max-age=9999')

		try {
			const image = await this.s3Model.getObject(this.resultsBucketName, imagePath);

			this.logger.info(`Serving '${imagePath}' image`);

			const imageData = await image.Body?.transformToWebStream(); // or any other way to get a readable stream
			const passThrough = new stream.PassThrough() // <---- this makes a trick with stream error handling
			//@ts-ignore
			stream.pipeline(imageData, passThrough, (err) => {
				if (err) {
					this.logger.error(err);
					return response.sendStatus(400);
				}
			})
			passThrough.pipe(response);
		} catch (exception) {
			this.logger.error(`File '${imagePath}' could not be obtained`, {exception});
			response.sendStatus(400);
		}

	}
}
