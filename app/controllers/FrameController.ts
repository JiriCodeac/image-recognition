import {Request, Response, Router} from 'express';
import BaseHttpController from "./BaseHttpController";
import {MetadataModel} from "../models/MetadataModel";
import {S3Model} from "../models/S3Model";
import Configurator from "../components/Configurator";
import {Logger} from "winston";
import Report from "../models/entities/Report";
import File from "../models/entities/File";

export default class FrameController extends BaseHttpController {
	private readonly resultsBucketName: string;

	constructor(
		private readonly metadataModel: MetadataModel,
		private readonly s3Model: S3Model,
		private readonly logger: Logger,
		configurator: Configurator,
	) {
		super();

		this.resultsBucketName = configurator.parameters<string>('s3.buckets.results');
	}

	register(router: Router): void {
		router.route('/frame/delete').post((request: Request, response: Response) => {
			return this.actionDelete(request, response);
		});
	}

	async actionDelete(request: Request, response: Response): Promise<void> {
		if (!this.canDelete(request)) {
			this.logger.warn(`User is not authorized`);
			response.status(401).send('Unauthorized');
		}

		const frameId = Number(request.query.id);

		const frame = await this.metadataModel.getFrame(frameId);

		if (!frame) {
			this.logger.warn(`Frame id=${frameId} does not exist.`);
			response.status(404).send();
			return;
		}

		this.logger.debug(`Frame id=${frame.get('id')} exists`);

		const paths: string[] = [];
		for (const detection of frame.getDetectionsFormatted()) {
			paths.push(detection.imagePath);
		}

		this.logger.warn(`Deleting frame id=${frameId} pictures`, {paths});

		const results = await this.s3Model.deleteObjects(this.resultsBucketName, paths.map(path => ({Key: path})));
		this.logger.debug('Frame pictures deleted', {results});

		// Is this frame the last one?
		const reportId = Number(frame.get('reportId'));
		const framesPerReport = await this.metadataModel.getFramesPerReport([reportId]);
		const frames = framesPerReport[reportId];

		this.logger.debug(`Remaining ${frames} frames in reportId=${reportId}`, {frames});

		if (frames <= 1) {
			const report = frame.get('report') as Report;
			const file = report.get('file') as File;
			const videoPath = `${file.getResultsPrefix()}/video.mp4`;
			this.logger.warn(`Frame id=${frameId} is the last for report id=${reportId}. Deleting the video as well.`, {videoPath});
			const deleted = await this.s3Model.deleteObjects(this.resultsBucketName, [{Key: videoPath}]);
			this.logger.debug('Video deleted', {deleted});
		}

		this.logger.warn(`Deleting frame id=${frameId}`, {frameId});
		await frame.destroy();

		this.logger.info(`Frame id=${frameId} deleted`, {frameId});
		response.redirect(301, '/');
	}
}
