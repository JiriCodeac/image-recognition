import {StorageModel} from "./StorageModel";
import TmpModel from "./TmpModel";
import WildLifeDetector from "../detectors/WildLifeDetector";
import {Logger} from "winston";
import BaseModel from "./BaseModel";
import {MetadataModel} from "./MetadataModel";
import WildLifeDetections from "../types/WildLifeDetections";
import File from "./entities/File";
import fs from "fs";
import NotEnoughFramesForAnalysisException from "../exceptions/NotEnoughFramesForAnalysisException";
import FrameExtractionFailedException from "../exceptions/FrameExtractionFailedException";

export default class VideoModel extends BaseModel {
	constructor(
		private readonly storageModel: StorageModel,
		private readonly tmpModel: TmpModel,
		private readonly metadataModel: MetadataModel,
		private readonly wildLifeDetector: WildLifeDetector,
		private readonly logger: Logger,
	) {
		super();
	}

	async performAnalysis(): Promise<any> {
		this.logger.info('Analysis started');
		const fileInfo = await this.storageModel.ingestNewValidFile();
		const newPath = fileInfo.metadata.source + '/' + fileInfo.metadata.captured.toISOString();
		const filename = fileInfo.metadata.captured.toISOString() + '.mp4';

		try {
			const filepath = await this.tmpModel.storeFile(filename, fileInfo.body);

			this.logger.info('Wild Life detection started');
			const startTime = performance.now();
			const analysis = await this.wildLifeDetector.run(filepath);
			const timeElapsed = performance.now() - startTime;

			this.logger.info(`Wild Life detection finished in ${timeElapsed}`, {analysis});

			await this.storeMetadata(analysis, fileInfo.metadata, timeElapsed);

			this.logger.info('Metadata stored to the database');

			if (analysis.frames.length) {
				this.logger.info(`Copying file ${fileInfo.metadata.path} to S3 storage ${newPath}`);
				await this.storageModel.copyFileToResults(filepath, newPath + '/video.mp4');

				for (const name of Object.keys(analysis.crops)) {
					const cropPath = analysis.crops[name];
					await this.storageModel.copyFileToResults(cropPath, newPath + '/' + name);
					fs.rmSync(cropPath, {
						recursive: true,
					});
				}
			}

			this.logger.info(`Deleting source file from FTP ${fileInfo.metadata.path}`);
			await this.storageModel.deleteFile(fileInfo.metadata.path);

			this.logger.info(`Deleting local copy ${filepath}`);
			this.tmpModel.deleteFile(filepath);
		} catch (exception) {
			if (exception instanceof FrameExtractionFailedException) {
				this.logger.info('Frame extraction failed', {exception});
				await this.storageModel.moveFileToSkipped(fileInfo.metadata.path);
				await this.storageModel.deleteFile(exception.filepath);
			}

			if (exception instanceof NotEnoughFramesForAnalysisException) {
				this.logger.info('Video does not have enough frames for analysis.', {exception});
				await this.storageModel.moveFileToSkipped(fileInfo.metadata.path);
				await this.storageModel.deleteFile(exception.filepath);
			}

			throw exception;
		}

		this.logger.info('Analysis finished');
	}

	private async storeMetadata(analysis: WildLifeDetections, fileMetadata: File, timeElapsed: number): Promise<any> {
		const file = await this.metadataModel.storeFile({
			...fileMetadata,
			length: analysis.videoLength,
		});

		const report = await this.metadataModel.storeReport({
			fileId: file.id,
			avgTimePerFrame: analysis.avgTime * 1000,
			duration: timeElapsed * 1000,
			errors: analysis.errors.substring(0, 62_000),
			output: analysis.output.substring(0, 62_000),
		});

		const frameInfos: Record<string, any>[] = analysis.frames.map(frame => ({
			...frame,
			reportId: report.id,
			detectedCategories: [...new Set(frame.detections.map((detection) => detection.category))],
		}));

		if (frameInfos.length) {
			await this.metadataModel.storeFrames(frameInfos);
		}

	}
}
