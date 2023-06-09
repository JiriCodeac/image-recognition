import {ChildProcess} from "../components/ChildProcess";
import BaseDetector from "./BaseDetector";
import {Logger} from "winston";
import fs from "fs";
import WildLifeDetections from "../types/WildLifeDetections";
import DetectionFailedException from "../exceptions/DetectionFailedException";
import {TMP_PREFIX} from "../models/TmpModel";

const INTERPRETER = '/usr/bin/python3';

export default class WildLifeDetector extends BaseDetector {

	constructor(logger: Logger) {
		super(logger);
	}

	public async run(filepath: string): Promise<WildLifeDetections> {
		const frameDir = filepath.replace('.mp4', '');

		if (!fs.existsSync(frameDir)) {
			fs.mkdirSync(frameDir);
		}

		const frameDirCrops = frameDir + '-crops';

		if (!fs.existsSync(frameDirCrops)) {
			fs.mkdirSync(frameDirCrops);
		}

		this.logger.info(`Extracting frames for ${filepath}`);
		const videoLength = await this.extractFrames(filepath, frameDir);

		this.logger.info(`Frame extraction to ${filepath} was successful.`, {videoLength});

		const basePath = __dirname;
		const args: string[] = [
			basePath + '/wildlife/run.py',
			frameDir,
		];

		this.logger.info(`Starting analysis for images in ${frameDir}`);

		const logger = (message: string): void => {
			this.logger.debug(message);

			const payload = {
				message,
				frameDir,
				videoLength,
			};

			fs.writeFileSync(TMP_PREFIX + 'wildlife-current.json', JSON.stringify(payload));
		};

		const {code, stdout, stderr} = await ChildProcess.spawn(INTERPRETER, args, basePath, logger);

		this.logger.debug('Exit code', {code});
		this.logger.debug('Standard Output', {stdout});
		this.logger.debug('Standard Error Output', {stderr});

		if (code === 1) {
			throw new DetectionFailedException(frameDir, code, stdout, stderr);
		}

		const results = fs.readFileSync(frameDir + '/output.json');

		const output = JSON.parse(results.toString()) as WildLifeDetections;
		output.videoLength = videoLength;
		output.output = stdout;
		output.errors = stderr;
		output.crops = {};

		for (const frame of output.frames) {
			const frameInfo = this.extractInfoFromFramePath(frame.file);
			frame.timestamp = frameInfo.timestamp;
			frame.height = frameInfo.height;
			frame.width = frameInfo.width;

			this.logger.info(`Cropping detections to ${frameDirCrops}`);
			for (const iterator in frame.detections) {
				const detection = frame.detections[iterator];
				const name = frame.timestamp + '-' + iterator + '.jpg';
				const destination = frameDirCrops + '/' + name;
				this.logger.debug(`Cropping detection to ${destination}`);
				const crop = await this.cropDetection(frame.file, frame.width, frame.height, detection.boundingBox, destination);
				this.logger.debug(`Crop result ${name}`, {crop});
				output.crops[name] = destination;
			}
		}

		fs.rmSync(frameDir, {
			recursive: true,
		});

		return output;
	}
}
