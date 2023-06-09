import {Request, Response, Router} from 'express';
import BaseHttpController from "./BaseHttpController";
import {MetadataModel} from "../models/MetadataModel";
import {S3Model} from "../models/S3Model";
import Configurator from "../components/Configurator";

export default class DetectionsController extends BaseHttpController {
	private readonly resultsBucketName: string;

	constructor(
		private readonly metadataModel: MetadataModel,
		private readonly s3Model: S3Model,
		configurator: Configurator,
	) {
		super();

		this.resultsBucketName = configurator.parameters<string>('s3.buckets.results');
	}

	register(router: Router): void {
		router.route('/latest-detections').get((request: Request, response: Response) => {
			return this.actionDefault(request, response);
		});
	}

	async actionDefault(request: Request, response: Response): Promise<void> {
		const frames = await this.metadataModel.listLatestFrames(15);
		const thumbnailPaths = this.metadataModel.extractThumbnailPaths(frames);
		const thumbnailContents = await this.s3Model.obtainThumbnailContents(thumbnailPaths, this.resultsBucketName);
		const detections = this.metadataModel.prepareDetections(frames);

		response.render('detections', {
			detections,
			thumbnails: thumbnailContents,
			canDelete: this.canDelete(request),
			userName: this.getUserName(request),
		});
	}
}
