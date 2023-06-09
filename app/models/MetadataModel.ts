import BaseModel from "./BaseModel";
import {Sequelize} from "sequelize-typescript";
import {Repository as DBRepository} from "sequelize-typescript/dist/sequelize/repository/repository";
import File from "./entities/File";
import Report from "./entities/Report";
import Frame from "./entities/Frame";
import {Op} from "sequelize";

interface DetectionItem {
	file: File,
	reports: {
		report: Report,
		frames: Frame[]
	}[],
}

export class MetadataModel extends BaseModel {
	protected readonly files: DBRepository<File>;
	protected readonly reports: DBRepository<Report>;
	protected readonly frames: DBRepository<Frame>;

	constructor(private readonly database: Sequelize) {
		super();

		this.files = database.getRepository(File);
		this.reports = database.getRepository(Report);
		this.frames = database.getRepository(Frame);
	}

	public storeFiles(files: Record<string, any>[]) {
		return this.files.bulkCreate(files);
	}

	public storeFile(file: Record<string, any>) {
		return this.files.create(file);
	}

	public storeReport(detection: Record<string, any>) {
		return this.reports.create(detection);
	}

	public async storeFrames(frames: Record<string, any>[]) {
		return this.frames.bulkCreate(frames);
	}

	public async listFiles(from: Date, to: Date): Promise<File[]> {
		return this.files.findAll({
			where: {
				captured: {
					[Op.gte]: from,
					[Op.lt]: to,
				},
			},
			order: [
				'captured',
			],
			include: {
				model: this.reports,
				as: 'reports',
				include: [
					'frames',
				],
			},
		});
	}

	public async getTimeline(): Promise<{ date: Date, videos: number, size: number }[]> {
		const result = await this.files.findAll({
			attributes: [
				[Sequelize.literal(`DATE(captured)`), 'date'],
				[Sequelize.literal(`COUNT(id)`), 'videos'],
				[Sequelize.literal(`SUM(size)`), 'size'],
			],
			group: [
				'date',
			],
			order: [
				'date',
			],
		});

		const output: { date: Date, videos: number, size: number }[] = [];

		for (const record of result) {
			output.push({
				//@ts-ignore
				date: new Date(record.get('date')),
				//@ts-ignore
				videos: Number(record.get('videos')),
				size: Number(record.get('size')),
			});
		}

		return output;
	}

	public async getFramesPerReport(reportIds: number[]): Promise<Record<string, number>> {
		const results = await this.frames.findAll({
			attributes: [
				'reportId',
				[Sequelize.literal(`COUNT(id)`), 'frames'],
			],
			group: [
				'reportId',
			],
			where: [{
				reportId: {
					[Op.in]: reportIds,
				},
			}],
		});

		const output: Record<string, number> = reportIds.reduce((accumulator, value) => {
			return {...accumulator, [value]: 0};
		}, {});

		for (const result of results) {
			//@ts-ignore
			output[result.get('reportId')] = Number(result.get('frames'));
		}

		return output;
	}

	public async listLatestFrames(limit = 5): Promise<Frame[]> {
		return this.frames.findAll({
			order: [
				['createdAt', 'DESC'],
				['timestamp', 'DESC'],
			],
			include: {
				model: this.reports,
				as: 'report',
				include: [
					'file',
				],
			},
			limit,
		});
	}

	public async listFramesPerReport(reportIds: number[]): Promise<Record<string, Frame[]>> {
		const frames = await this.frames.findAll({
			order: [
				['createdAt', 'DESC'],
				['timestamp', 'ASC'],
			],
			where: [{
				reportId: {
					[Op.in]: reportIds,
				},
			}],
		});

		const output: Record<string, Frame[]> = reportIds.reduce((accumulator, value) => {
			return {...accumulator, [value]: []};
		}, {});

		for (const frame of frames) {
			const reportId = String(frame.get('reportId'));

			if (!output.hasOwnProperty(reportId)) {
				output[reportId] = [];
			}

			output[reportId].push(frame);
		}

		return output;
	}

	public extractThumbnailPaths(frames: Frame[]): string[] {
		const result: string[] = [];

		for (const frame of frames) {
			for (const detection of frame.getDetectionsFormatted()) {
				result.push(detection.imagePath);
			}
		}

		return result;
	}

	//@ToDo: Merge with extractThumbnailPaths
	public extractThumbnailPathsDashboard(frames: Frame[], reports: Record<string, Report>, files: Record<string, File>): string[] {
		const result: string[] = [];

		for (const frame of frames) {
			const reportId = String(frame.get('reportId'));
			const report = reports[reportId];
			const fileId = String(report.get('fileId'));
			const file = files[fileId];

			for (const detection of frame.getDetectionsFormatted(report, file)) {
				result.push(detection.imagePath);
			}
		}

		return result;
	}

	public prepareDetections(frames: Frame[], reports: Record<string, Report> = {}, files: Record<string, File> = {}) {
		const structure: Record<string, {
			file: File,
			reports: Record<string, {
				report: Report,
				frames: Frame[],
			}>,
		}> = {};
		const output: DetectionItem[] = [];

		for (const frame of frames) {
			let report = frame.get('report') as Report;

			if (!report) {
				report = reports[String(frame.get('reportId'))];
			}

			let file = report.get('file') as File;

			if (!file) {
				file = files[String(report.get('fileId'))];
			}

			const fileId = file.get('id') as number;
			const reportId = report.get('id') as number;

			if (!structure.hasOwnProperty(fileId)) {
				structure[fileId] = {
					file,
					reports: {},
				};
			}

			if (!structure[fileId].hasOwnProperty(reportId)) {
				structure[fileId].reports[reportId] = {
					report: report,
					frames: [],
				};
			}

			structure[fileId].reports[reportId].frames.push(frame);
		}

		for (const fileId of Object.keys(structure)) {
			const file = structure[fileId].file;
			const fileResult = {
				reports: [],
				file,
			};

			for (const reportId of Object.keys(structure[fileId].reports)) {
				const report = structure[fileId].reports[reportId].report;
				const frames = structure[fileId].reports[reportId].frames;
				const reportResult = {
					report,
					frames,
				};

				//@ts-ignore
				fileResult.reports.push(reportResult);
			}

			output.push(fileResult);
		}

		return output;
	}

	public async getFrame(frameId: number): Promise<Frame | null> {
		return this.frames.findOne({
			where: {
				id: frameId,
			},
			include: {
				model: this.reports,
				as: 'report',
				include: [
					'file',
				],
			},
		});
	}

	public async getDetectionsPerDay(): Promise<{ date: Date, detections: number }[]> {
		//@ts-ignore
		const [results] = await this.database.query(`
			SELECT DATE (files.captured) as \`date\`, COUNT (aggregatedFrames.reportId) as videosWithDetections
			FROM
				(SELECT DISTINCT reportId FROM \`frames\`) as aggregatedFrames
				LEFT JOIN reports
			ON aggregatedFrames.reportId = reports.id
				LEFT JOIN files ON reports.fileId = files.id
			GROUP BY \`date\`
		`);

		const output: { date: Date, detections: number }[] = [];

		for (const record of results) {
			output.push({
				//@ts-ignore
				date: new Date(record.date),
				//@ts-ignore
				detections: Number(record.videosWithDetections),
			});
		}

		return output;
	}

	async getBestFrames(to: Date, from: Date, limit = 0, best = true): Promise<Frame[]> {
		const files = await this.files.findAll({
			attributes: [
				'id',
			],
			where: {
				captured: {
					[Op.gte]: from,
					[Op.lt]: to,
				},
			},
		});

		const fileIds = files.map((file) => file.id);

		const reports = await this.reports.findAll({
			attributes: [
				'id',
			],
			where: {
				fileId: {
					[Op.in]: fileIds,
				},
			},
		});

		const reportIds = reports.map((report) => report.id);

		let limitQuery = {}

		if (limit) {
			limitQuery = {
				limit,
			};
		}

		return this.frames.findAll({
			where: {
				reportId: {
					[Op.in]: reportIds,
				},
			},
			order: [
				['maxDetectionConfidence', best ? 'DESC' : 'ASC'],
			],
			include: {
				model: this.reports,
				as: 'report',
				include: [
					'file',
				],
			},
			...limitQuery,
		});
	}
}
