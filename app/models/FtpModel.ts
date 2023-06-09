import BaseModel from "./BaseModel";
import PromiseFtp from "promise-ftp";
import {ListingElement} from "ftp";
import path from "path";
import {Logger} from "winston";
import NoFileFoundException from "../exceptions/NoFileFoundException";
import * as PromiseFtpCommon from "promise-ftp-common";

export class FtpModel extends BaseModel {
	constructor(private readonly ftpClient: Promise<PromiseFtp>, private readonly logger: Logger) {
		super();
	}

	private async list(path = ''): Promise<ListingElement[]> {
		const client = await this.ftpClient;
		return client.list(path) as unknown as Promise<ListingElement[]>;
	}

	public async listAllFiles(directoryPath = ''): Promise<ListingElement[]> {
		const list = await this.list(directoryPath);

		const output: ListingElement[] = [];
		const promises: Promise<ListingElement[]>[] = [];

		if (!list?.length) {
			return output;
		}

		for (const item of list) {
			const pathNew = `${directoryPath}/${item.name}`;
			if (item.type === 'd') {
				promises.push(this.listAllFiles(pathNew));
			} else {
				item.name = pathNew;
				output.push(item);
			}
		}

		const results = await Promise.all(promises);

		return output.concat(...results);
	}

	public async getFirstFile(directoryPath = ''): Promise<ListingElement> {
		const list = await this.list(directoryPath);

		if (list?.length) {
			for (const item of list) {
				const pathNew = `${directoryPath}/${item.name}`;
				if (item.type === 'd') {
					try {
						return await this.getFirstFile(pathNew);
					} catch (error) {
						//this.logger.debug(error);
					}
				} else {
					item.name = pathNew;
					return item;
				}
			}
		}

		throw new NoFileFoundException(directoryPath, 'No files on the FTP server path');
	}

	public async listAllFilePaths(path = ''): Promise<string[]> {
		const list = await this.listAllFiles(path);
		return list.map((item) => item.name);
	}

	public async upload(destPath: string, input: NodeJS.ReadableStream | Buffer | string): Promise<void> {
		const client = await this.ftpClient;
		const dirname = path.dirname(destPath);
		this.logger.debug(`FTP Upload: Ensuring the directory ${dirname} is present.`);
		await this.makeDirectory(dirname);
		this.logger.debug(`FTP Upload: Uploading file content to ${destPath}.`);
		return client.put(input, destPath);
	}

	public async move(from: string, to: string): Promise<void> {
		const client = await this.ftpClient;
		this.logger.debug(`FTP Move: Initiating from ${from} to ${to}.`);

		const dirname = path.dirname(to);
		this.logger.debug(`FTP Upload: Ensuring the directory ${dirname} is present.`);
		await this.makeDirectory(dirname);
		await client.rename(from, to);

		this.logger.debug(`FTP Move: Successfully moved from ${from} to ${to}.`);
	}

	public async delete(filePath: string): Promise<void> {
		const client = await this.ftpClient;
		this.logger.debug(`FTP Delete: Deleting file ${filePath}.`);
		return client.delete(filePath);
	}

	public async makeDirectory(directoryPath: string, recursive = true): Promise<void> {
		const client = await this.ftpClient;
		return client.mkdir(directoryPath, recursive);
	}

	public async getFile(filePath: string): Promise<NodeJS.ReadableStream> {
		const client = await this.ftpClient;
		return client.get(filePath);
	}

	public async getStatus(): Promise<PromiseFtpCommon.STATUSES> {
		const client = await this.ftpClient;
		return client.getConnectionStatus();
	}
}
