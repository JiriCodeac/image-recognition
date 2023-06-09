import BaseModel from "./BaseModel";
import {Logger} from "winston";
import fs from "fs";

export const TMP_PREFIX = '/tmp/';

export default class TmpModel extends BaseModel {
	constructor(private readonly logger: Logger) {
		super();
	}

	public async storeFile(filename: string, body: NodeJS.ReadableStream): Promise<string> {
		return new Promise((resolve) => {
			const filepath = TMP_PREFIX + filename;
			const stream = fs.createWriteStream(filepath);
			body.pipe(stream);
			body.on('end', () => resolve(filepath));

			this.logger.info(`Storing file ${filepath}`);
		});
	}

	public readStatus(filename: string): Record<string, string> {
		const content = fs.readFileSync(TMP_PREFIX + filename);

		return JSON.parse(content.toString());
	}

	public deleteFile(filepath: string): void {
		fs.rmSync(filepath);
	}
}
