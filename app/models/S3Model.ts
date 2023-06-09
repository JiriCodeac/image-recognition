import assert from "assert";
import BaseModel from "./BaseModel";
import {
	CopyObjectCommand,
	CopyObjectCommandInput,
	CopyObjectCommandOutput,
	CreateBucketCommand,
	CreateBucketCommandInput,
	CreateBucketCommandOutput,
	DeleteBucketCommand,
	DeleteBucketCommandInput,
	DeleteBucketCommandOutput,
	DeleteObjectsCommand,
	DeleteObjectsCommandInput,
	DeleteObjectsCommandOutput,
	GetObjectCommand,
	GetObjectCommandInput,
	GetObjectCommandOutput,
	HeadBucketCommand,
	HeadBucketCommandInput,
	HeadBucketCommandOutput,
	ListObjectsV2Command,
	ListObjectsV2CommandInput,
	ListObjectsV2CommandOutput,
	PutObjectCommand,
	PutObjectCommandInput,
	PutObjectCommandOutput,
	S3Client,
} from "@aws-sdk/client-s3";
import {ObjectIdentifier} from "@aws-sdk/client-s3/dist-types/models/models_0";
import {Readable} from "stream";

export class S3Model extends BaseModel {
	constructor(private readonly s3Client: S3Client) {
		super();
	}

	public createBucket(bucket: string, params?: Omit<CreateBucketCommandInput, "Bucket">): Promise<CreateBucketCommandOutput> {
		const input: CreateBucketCommandInput = {
			Bucket: bucket,
			...params,
		};

		const command = new CreateBucketCommand(input);
		return this.s3Client.send(command);
	}

	public deleteBucket(bucket: string, params?: Omit<DeleteBucketCommandInput, "Bucket">): Promise<DeleteBucketCommandOutput> {
		const input: DeleteBucketCommandInput = {
			Bucket: bucket,
			...params,
		};

		const command = new DeleteBucketCommand(input);
		return this.s3Client.send(command);
	}

	public deleteObjects(bucket: string, objects: ObjectIdentifier[], params?: Omit<DeleteObjectsCommandInput, "Bucket">): Promise<DeleteObjectsCommandOutput> {
		const input: DeleteObjectsCommandInput = {
			Bucket: bucket,
			...params,
			Delete: {
				Objects: objects,
			},
		};

		const command = new DeleteObjectsCommand(input);
		return this.s3Client.send(command);
	}

	public putObject(bucket: string, key: string, body: string | Uint8Array | Buffer, params?: Omit<PutObjectCommandInput, "Bucket" | "Key">): Promise<PutObjectCommandOutput> {
		const input: PutObjectCommandInput = {
			Bucket: bucket,
			Key: key,
			Body: body,
			...params,
		};

		const command = new PutObjectCommand(input);
		return this.s3Client.send(command);
	}

	public getObject(bucket: string, key: string, params?: Omit<GetObjectCommandInput, "Bucket" | "Key">): Promise<GetObjectCommandOutput> {
		const input: GetObjectCommandInput = {
			Bucket: bucket,
			Key: key,
			...params,
		};

		const command = new GetObjectCommand(input);
		return this.s3Client.send(command);
	}

	public listObjects(bucket: string, prefix = '', params?: Omit<ListObjectsV2CommandInput, "Bucket" | "Prefix">): Promise<ListObjectsV2CommandOutput> {
		const input: ListObjectsV2CommandInput = {
			Bucket: bucket,
			Prefix: prefix,
			...params,
		};

		const command = new ListObjectsV2Command(input);
		return this.s3Client.send(command);
	}

	public async listAllObjects(bucketName: string, prefix = ''): Promise<string[]> {
		let continuationToken: string | undefined;
		const keys: string[] = [];
		do {
			const list = await this.listObjects(bucketName, prefix, {
				ContinuationToken: continuationToken,
			});
			continuationToken = list.NextContinuationToken;

			assert.ok(list.Contents, 'S3 Object list is empty');

			for (const object of list.Contents) {
				assert.ok(object.Key, 'S3 Object key is missing');
				keys.push(object.Key);
			}
		} while (continuationToken);

		return keys;
	}

	public copyObject(bucket: string, source: string, destination: string, params?: Omit<CopyObjectCommandInput, "Bucket" | "Key" | "CopySource">): Promise<CopyObjectCommandOutput> {
		const input: CopyObjectCommandInput = {
			Bucket: bucket,
			CopySource: `${bucket}/${source}`,
			Key: destination,
			...params,
		};

		const command = new CopyObjectCommand(input);
		return this.s3Client.send(command);
	}

	public async emptyBucket(bucket: string): Promise<void> {
		const allObjects = await this.listAllObjects(bucket);
		const keys: ObjectIdentifier[] = allObjects.map((key) => ({Key: key}));

		while (keys.length > 0) {
			const batch = keys.splice(0, 1000);
			await this.deleteObjects(bucket, batch);
		}
	}

	public async getBucketHead(bucket: string): Promise<HeadBucketCommandOutput> {
		const input: HeadBucketCommandInput = {
			Bucket: bucket,
		};

		const command = new HeadBucketCommand(input);
		return this.s3Client.send(command);
	}

	public async getStatus(bucket: string) {
		const head = await this.getBucketHead(bucket);

		return head.$metadata.httpStatusCode == 200;
	}

	public async obtainThumbnailContents(paths: string[], bucketName: string, includeContent = false): Promise<Record<string, Readable | ReadableStream | Blob>> {
		if (includeContent) {
			const promises = [];

			for (const path of paths) {
				const promise = this.getObject(bucketName, path)
					.then(async (result) => ({
						path,
						result: 'data:image/jpeg;base64,' + (await result.Body?.transformToString('base64')),
					})).catch((error) => {
						console.error(error);
						return {
							path,
							result: {
								Body: '',
							},
						};
					});
				promises.push(promise);
			}

			const files = await Promise.all(promises);
			const output: Record<string, Readable | ReadableStream | Blob> = {}

			for (const file of files) {
				//@ts-ignore
				output[file.path] = file.result;
			}

			return output;
		}

		const output: Record<string, Readable | ReadableStream | Blob> = {}

		for (const file of paths) {
			//@ts-ignore
			output[file] = '/image/' + encodeURIComponent(file);
		}

		return output;
	}
}
