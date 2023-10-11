import {Request, Response, Router} from 'express';
import BaseHttpController from "./BaseHttpController";
import {MetadataModel} from "../models/MetadataModel";
import {S3Model} from "../models/S3Model";
import Configurator from "../components/Configurator";
import {formatDate} from "../components/utils";

export default class BestFramesController extends BaseHttpController {
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
		router.route('/best-frames').get((request: Request, response: Response) => {
			return this.actionDefault(request, response);
		});
	}

	async actionDefault(request: Request, response: Response): Promise<void> {
		const now = new Date();
		const from = request.query?.from;
		const to = request.query?.to;
		const limit = request.query?.limit ? Number(request.query?.limit) : 0;
		const best = Boolean(request.query?.best) ?? true;

		const toDate = Boolean(to) ? new Date(Date.parse(String(to))) : now;
		const yesterday = new Date(toDate);
		yesterday.setDate(yesterday.getDate() - 1);
		const fromDate = from ? new Date(Date.parse(String(from))) : yesterday;

		const frames = await this.metadataModel.getBestFrames(toDate, fromDate, limit, best);
		const thumbnailPaths = this.metadataModel.extractThumbnailPaths(frames);
		const thumbnailContents = await this.s3Model.obtainThumbnailContents(thumbnailPaths, this.resultsBucketName);
		const detections = this.metadataModel.prepareDetections(frames);

		response.render('frame-list', {
			from: formatDate(fromDate),
			to: formatDate(toDate),
			frames,
			detections,
			thumbnails: thumbnailContents,
			best,
			limit,
			canDelete: this.canDelete(request),
			userName: this.getUserName(request),
		});
	}
}
