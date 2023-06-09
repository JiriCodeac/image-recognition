import humanizeDuration from 'humanize-duration';
import {Logger} from "winston";
import BaseController from './BaseController';
import VideoModel from "../models/VideoModel";
import {sleep} from "../components/utils";
import FileAlreadySkippedException from "../exceptions/FileAlreadySkippedException";
import NotEnoughFramesForAnalysisException from "../exceptions/NotEnoughFramesForAnalysisException";
import {StorageModel} from "../models/StorageModel";

export default class AnalysisController extends BaseController {
	constructor(
		private readonly videoModel: VideoModel,
		private readonly storageModel: StorageModel,
		private readonly logger: Logger,
	) {
		super();
	}

	async actionDefault(): Promise<void> {
		let counter = 1;
		const startTime = performance.now();
		while (true) {
			const timeElapsed = Math.round(performance.now() - startTime);
			this.logger.info(`Starting analysis #${counter}. Running ${humanizeDuration(timeElapsed)}`);
			try {
				await this.videoModel.performAnalysis();
			} catch (exception) {
				if (exception instanceof FileAlreadySkippedException) {
					this.logger.info('Found only already skipped file', {exception});
				} else {
					console.error(exception);
					this.logger.debug('Exception during analysis', {exception});
				}

				this.logger.info('Nothing to analyze.');

				// Try to grab a backup file
				await this.moveFirstFileFromSourceToFtp();
			}

			this.logger.info('Waiting for 20s.');
			await sleep(20_000);
			counter++;
		}
	}

	private async moveFirstFileFromSourceToFtp(): Promise<void> {
		try {
			await this.storageModel.moveFirstFileFromSourceToFtp();
		} catch(exception) {
			this.logger.silly(String(exception));
		}
	}
}
