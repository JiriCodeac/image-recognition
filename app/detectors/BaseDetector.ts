//@ts-ignore
import extractFrames from 'ffmpeg-extract-frames';
import {getVideoDurationInSeconds} from 'get-video-duration';
import sharp from 'sharp';
import * as fs from 'fs';
import {Logger} from "winston";
import NotEnoughFramesForAnalysisException from "../exceptions/NotEnoughFramesForAnalysisException";
import FrameExtractionFailedException from "../exceptions/FrameExtractionFailedException";

interface FrameInfo {
	width: number,
	height: number,
	timestamp: number,
}

export default abstract class BaseDetector {

	constructor(protected readonly logger: Logger) {
	}

	protected extractInfoFromFramePath(filepath: string): FrameInfo {
		const regex = /(?<prefix>.*)\/(?<width>\d+)x(?<height>\d+)-(?<timestamp>.*).jpg/;
		const result = filepath.match(regex);
		const groups = result?.groups;

		if (!groups) {
			throw new Error(`No match found in ${filepath}`);
		}

		return {
			width: Number(groups.width),
			height: Number(groups.height),
			timestamp: Number(groups.timestamp),
		};
	}

	async extractFrames(filepath: string, destination: string, fps = 1): Promise<number> {
		const videoLength = await getVideoDurationInSeconds(filepath);
		try {
			await extractFrames({
				input: filepath,
				fps,
				output: destination + '/%05d.jpg',
				log: this.logger.verbose,
			});
		} catch (exception) {
			this.logger.error(exception);
			throw new FrameExtractionFailedException(filepath, destination, `Frame extraction of ${filepath} was unsuccessful`);
		}

		const files = fs.readdirSync(destination);

		if (files.length < 1) {
			throw new NotEnoughFramesForAnalysisException(destination, `No frames extracted from the video ${filepath}`);
		}

		this.logger.info(`Extracted ${files.length} frames from ${filepath}.`);

		for (const file of files) {
			const oldPath = destination + '/' + file;
			let metadata;
			try {
				metadata = await sharp(oldPath).metadata();
			} catch (exception) {
				this.logger.warn('Can not load image metadata', {oldPath, exception});
				console.error(exception);
				this.logger.info('Removing file', {oldPath});
				fs.rmSync(oldPath);
				continue;
			}
			const resolution = `${metadata.width}x${metadata.height}`;
			const [filename, extension] = file.split('.');
			const timestamp = String(parseInt(filename) * fps).padStart(5, '0');
			const newPath = destination + '/' + resolution + '-' + timestamp + '.' + extension;
			fs.renameSync(oldPath, newPath);
		}

		return videoLength;
	}

	public static getCropDetectionDimensions(width: number, height: number, boundingBox: number[], border = 100) {
		const [x1, y1, wBox, hBox] = boundingBox;
		// Convert to pixels https://github.com/microsoft/CameraTraps/blob/main/visualization/visualization_utils.py#L206
		const left = Math.round(x1 * width);
		const boxWidth = Math.round(wBox * width);
		const top = Math.round(y1 * height);
		const boxHeight = Math.round(hBox * height);

		const leftWithBorder = (left - border) <= 0 ? 0 : left - border;
		const topWithBorder = (top - border) <= 0 ? 0 : top - border;
		const widthWithBorder = (boxWidth + left + border) >= width ? width - leftWithBorder : boxWidth + 2 * border;
		const heightWithBorder = (boxHeight + top + border) >= height ? height - topWithBorder : boxHeight + 2 * border;

		return {
			leftWithBorder,
			topWithBorder,
			widthWithBorder,
			heightWithBorder,
		};
	}

	public async cropDetection(filepath: string, width: number, height: number, boundingBox: number[], destinationPath: string, border = 100): Promise<any> {
		const {
			leftWithBorder,
			topWithBorder,
			widthWithBorder,
			heightWithBorder,
		} = BaseDetector.getCropDetectionDimensions(width, height, boundingBox, border);

		this.logger.info('Crop dimensions', {
			filepath,
			width,
			height,
			leftWithBorder,
			topWithBorder,
			widthWithBorder,
			heightWithBorder,
		});

		return sharp(filepath).extract({
			left: leftWithBorder,
			top: topWithBorder,
			width: widthWithBorder,
			height: heightWithBorder,
		}).toFile(destinationPath);
	}
}
