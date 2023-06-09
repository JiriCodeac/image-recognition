import BaseModel from "./BaseModel";
import {S3Model} from "./S3Model";
import {FtpModel} from "./FtpModel";
import Configurator from "../components/Configurator";
import {sleep, streamToBuffer} from "../components/utils";
import {Logger} from "winston";
import File, {FILE_EXTENSIONS, FileType} from "./entities/File";
import InvalidFilePathException from "../exceptions/InvalidFilePathException";
import FileAlreadySkippedException from "../exceptions/FileAlreadySkippedException";
import fs from "fs";

export const SKIPPED_PREFIX = '/z_skipped';

export class StorageModel extends BaseModel {
	private readonly bucketNameSource: string;
	private readonly bucketNameResults: string;

	constructor(
		private readonly ftpModel: FtpModel,
		private readonly s3Model: S3Model,
		private readonly logger: Logger,
		configurator: Configurator,
	) {
		super();

		this.bucketNameSource = configurator.parameters('s3.buckets.source');
		this.bucketNameResults = configurator.parameters('s3.buckets.results');
	}

	public async ingestNewFile(): Promise<File> {
		const file = await this.ftpModel.getFirstFile();

		if (file.name.includes(SKIPPED_PREFIX)) {
			throw new FileAlreadySkippedException(file.name);
		}

		return {
			path: file.name,
			size: file.size,
			type: this.identifyFileType(file.name),
			...this.parseFilePath(file.name),
		} as File;
	}

	public async ingestNewValidFile(): Promise<{ metadata: File, body: NodeJS.ReadableStream }> {
		while (true) {
			try {
				const file = await this.ingestNewFile();
				if (file.type !== FileType.VIDEO) {
					this.logger.info('File is not a VIDEO', {file});
					await this.moveFileToSkipped(file.path);
					await sleep(1000);
					continue;
				}

				if (file.path.includes('Krmitko') || file.path.includes('Garage 1')) { // ToDo
					this.logger.info('File is from Krmitko', {file});
					await this.moveFileToSkipped(file.path);
					await sleep(1000);
					continue;
				}

				this.logger.info(`Selected file ${file.path}`, {file});

				return {
					metadata: file,
					body: await this.ftpModel.getFile(file.path),
				};
			} catch (exception) {
				if (exception instanceof InvalidFilePathException) {
					this.logger.info(`Invalid file path ${exception.filepath}`, {error: exception});
					await this.moveFileToSkipped(exception.filepath);
					await sleep(1000);
					continue;
				}

				throw exception;
			}
		}
	}

	public async moveFileToSkipped(filepath: string): Promise<void> {
		this.logger.info(`Moving file ${filepath} to skipped directory.`, {
			original: filepath,
			new: SKIPPED_PREFIX + filepath,
		});
		return this.ftpModel.move(filepath, SKIPPED_PREFIX + filepath);
	}

	private parseFilePath(filepath: string): { source: string, captured: Date } {
		const filename = filepath.split('/').pop() || '';
		const filenameRegex = /(?<source>.*)_(?<created>[0-9]+)\..*/;
		const filenameResult = filenameRegex.exec(filename);

		if (filenameResult?.groups) {
			const captured = filenameResult.groups?.created;
			const timeRegex = /(?<year>[0-9]{4})(?<month>[0-9]{2})(?<day>[0-9]{2})(?<hour>[0-9]{2})(?<minute>[0-9]{2})(?<second>[0-9]{2})/;
			const timeResult = timeRegex.exec(captured);

			if (timeResult?.groups) {
				const {year, month, day, hour, minute, second} = timeResult?.groups;
				return {
					source: filenameResult.groups?.source.replace(/_0{0,2}$/, ''),
					captured: new Date(
						Number(year),
						Number(month) - 1,
						Number(day),
						Number(hour),
						Number(minute),
						Number(second),
					),
				};
			}

			throw new InvalidFilePathException(filepath, `Time ${captured} can not be parsed.`);
		}

		throw new InvalidFilePathException(filepath, `File path ${filepath} can not be parsed.`);
	}

	private identifyFileType(filename: string): FileType {
		const extension = filename.split('.').pop();

		if (extension && Object.hasOwn(FILE_EXTENSIONS, extension)) {
			return FILE_EXTENSIONS[extension];
		}

		return FileType.OTHER;
	}

	/**
	 * @deprecated
	 */
	public async moveFtpToSource() {
		const files = await this.ftpModel.listAllFilePaths();

		for (const filename of files) {
			const data = await this.ftpModel.getFile(filename);
			const buffer = await streamToBuffer(data);
			await this.s3Model.putObject(this.bucketNameSource, filename, buffer);
			await this.ftpModel.delete(filename);
			this.logger.debug('File moved from FTP to S3', {
				filename,
			});
		}
	}

	public async moveFirstFileFromSourceToFtp(): Promise<void> {
		const results = await this.s3Model.listObjects(this.bucketNameSource, '', {
			MaxKeys: 3,
		});

		this.logger.debug(`Found ${results.KeyCount} files in the ${this.bucketNameSource} bucket.`);

		const file = results.Contents?.pop();

		if (!file) {
			const message = `Bucket ${this.bucketNameSource} is empty.`;
			this.logger.info(message);
			throw new Error(message);
		}

		this.logger.info(`Selected ${file.Key} for transfer to FTP.`);

		const fileObject = await this.s3Model.getObject(this.bucketNameSource, String(file.Key));

		if (!fileObject.Body) {
			const message = `Content of file ${file.Key} is empty.`;
			this.logger.info(message);
			throw new Error(message);
		}

		const content = fileObject.Body.transformToWebStream();

		//ToDo: Use streams
		//@ts-ignore
		const buffer = await streamToBuffer(content);

		await this.ftpModel.upload(String(file.Key), buffer);

		this.logger.info(`File ${file.Key} uploaded to FTP.`);

		await this.s3Model.deleteObjects(this.bucketNameSource, [{Key: String(file.Key)}]);

		this.logger.info(`File ${file.Key} deleted from ${this.bucketNameSource} bucket.`);
	}

	async deleteFile(filepath: string): Promise<void> {
		await this.ftpModel.delete(filepath);
	}

	async copyFileToResults(sourcePath: string, filename: string): Promise<void> {
		const data = fs.readFileSync(sourcePath);
		await this.s3Model.putObject(this.bucketNameResults, filename, data);
	}
}
