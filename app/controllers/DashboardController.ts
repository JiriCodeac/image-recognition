import {Request, Response, Router} from 'express';
import BaseHttpController from "./BaseHttpController";
import {MetadataModel} from "../models/MetadataModel";
import Report from "../models/entities/Report";
import {S3Model} from "../models/S3Model";
import Configurator from "../components/Configurator";
import File from "../models/entities/File";
import {filesize} from "filesize";
import TmpModel from "../models/TmpModel";

interface TimelineMenuItem {
	year: number,
	videos: number,
	size: number,
	months: {
		month: number,
		videos: number,
		size: number,
		days: {
			day: number,
			videos: number,
			size: number,
			date: string,
		}[],
	}[],
}

export default class DashboardController extends BaseHttpController {
	private readonly resultsBucketName: string;

	constructor(
		private readonly metadataModel: MetadataModel,
		private readonly s3Model: S3Model,
		private readonly tmpModel: TmpModel,
		configurator: Configurator,
	) {
		super();

		this.resultsBucketName = configurator.parameters<string>('s3.buckets.results');
	}

	register(router: Router): void {
		router.route('/').get((request: Request, response: Response) => {
			return this.actionDefault(request, response);
		});
	}

	async actionDefault(request: Request, response: Response): Promise<void> {
		const now = new Date();
		const date = request.query.date;
		const chartYear = String(request.query.chartYear || now.getFullYear());
		const timeline = await this.metadataModel.getTimeline();
		const timelineMenu = this.generateMenu(timeline);

		const userName = this.getUserName(request);

		if (date) {
			const startDate = new Date(String(date));
			const yesterday = new Date(startDate.valueOf() + 24 * 60 * 60 * 1000);
			const files = await this.metadataModel.listFiles(startDate, yesterday);
			const reports: Record<string, Report> = {};
			const fileCache: Record<string, File> = {};

			const reportIds = files.map((file) => {
				fileCache[String(file.get('id'))] = file;
				return file.get('reports').map((report: Report) => {
					const reportId = report.get('id');
					reports[String(reportId)] = report;
					return reportId;
				});
			}).flat(1);

			const framesPerReport = await this.metadataModel.listFramesPerReport(reportIds);
			const frames = Object.values(framesPerReport).flat(1);
			const thumbnailPaths = this.metadataModel.extractThumbnailPathsDashboard(frames, reports, fileCache);
			const thumbnails = await this.s3Model.obtainThumbnailContents(thumbnailPaths, this.resultsBucketName);
			const detections = this.metadataModel.prepareDetections(frames, reports, fileCache);
			const framesPerFileEmpty = Object.keys(fileCache).reduce((accumulator: Record<string, number>, value) => {
				return {...accumulator, [value]: 0};
			}, {});
			const framesPerFile = frames.reduce((accumulator: Record<string, number>, frame) => {
				const report = reports[String(frame.get('reportId'))];
				const fileId = String(report.get('fileId'));
				const amount: number = accumulator.hasOwnProperty(fileId) ? accumulator[fileId] : 0;

				return {
					...accumulator,
					[String(report.get('fileId'))]: amount + 1,
				};
			}, framesPerFileEmpty);

			response.render('files', {
				date,
				files,
				timelineMenu,
				thumbnails,
				detections,
				framesPerReport,
				framesPerFile,
				canDelete: this.canDelete(request),
				userName,
			});

			return;
		}

		const totalSize = timeline.reduce((accumulator, item) => accumulator + item.size, 0);
		const detectionsPerDay = await this.metadataModel.getDetectionsPerDay();

		const {
			dates,
			videos,
			detections,
		} = this.prepareChartData(timeline, detectionsPerDay);

		response.render('dashboard', {
			timelineMenu,
			dates: JSON.stringify(dates[chartYear]),
			videos: JSON.stringify(videos[chartYear]),
			detections: JSON.stringify(detections[chartYear]),
			years: Object.keys(dates),
			chartYear,
			totalVideoSize: filesize(totalSize, {
				base: 2,
				standard: "jedec",
			}),
			canDelete: this.canDelete(request),
			userName,
			wildFireStatus: this.getStatus(),
		});
	}

	private getStatus() {
		try {
			const content = this.tmpModel.readStatus('wildlife-current.json');
			const pattern = new RegExp('(?<percentage>[0-9]+)% (?<path>.*): analysis took (?<time>.*)');
			const matches = pattern.exec(content.message);

			return {
				...content,
				...matches?.groups,
			};

		} catch(exception) {
			return false;
		}
	}

	private prepareChartData(timeline: { date: Date, videos: number }[], detectionsPerDay: {
		date: Date,
		detections: number
	}[]) {
		const dates: Record<string, Date[]> = {};
		const videos: Record<string, number[]> = {};
		const detections: Record<string, number[]> = {};
		const detectionsPerEveryDay: Record<string, number> = timeline.reduce((accumulator, value) => {
			const date = `${value.date.getFullYear()}-${value.date.getMonth() + 1}-${value.date.getDate()}`;
			return {
				...accumulator,
				[date]: 0,
			};
		}, {});


		for (const time of timeline) {
			const year = time.date.getFullYear();
			if (!Object.prototype.hasOwnProperty.call(dates, year)) {
				dates[year] = [];
			}
			if (!Object.prototype.hasOwnProperty.call(videos, year)) {
				videos[year] = [];
			}

			dates[year].push(time.date);
			videos[year].push(time.videos);
		}

		for (const time of detectionsPerDay) {
			const date = `${time.date.getFullYear()}-${time.date.getMonth() + 1}-${time.date.getDate()}`;
			detectionsPerEveryDay[date] = time.detections;
		}

		for (const time of Object.keys(detectionsPerEveryDay)) {
			const date = new Date(time);
			const detection = detectionsPerEveryDay[time];
			const year = date.getFullYear();


			if (!Object.prototype.hasOwnProperty.call(detections, year)) {
				detections[year] = [];
			}

			detections[year].push(detection);
		}

		return {
			dates,
			videos,
			detections,
		}
	}

	private generateMenu(timeline: { date: Date, videos: number, size: number }[]): TimelineMenuItem[] {
		const aggregations: Record<string, Record<string, Record<string, { videos: number, size: number }>>> = {};
		const menu: TimelineMenuItem[] = [];

		for (const date of timeline) {
			const year = date.date.getFullYear();
			const month = date.date.getMonth() + 1;
			const day = date.date.getDate();

			if (!Object.prototype.hasOwnProperty.call(aggregations, year)) {
				aggregations[year] = {};
			}

			if (!Object.prototype.hasOwnProperty.call(aggregations[year], month)) {
				aggregations[year][month] = {};
			}

			if (!Object.prototype.hasOwnProperty.call(aggregations[year][month], day)) {
				aggregations[year][month][day] = {
					videos: date.videos,
					size: date.size,
				};
			}
		}

		for (const year of Object.keys(aggregations)) {
			const yearResult = {
				year: Number(year),
				videos: 0,
				size: 0,
				months: [],
			};

			for (const month of Object.keys(aggregations[year])) {
				const monthResult = {
					month: Number(month),
					videos: 0,
					size: 0,
					days: [],
				};

				for (const day of Object.keys(aggregations[year][month])) {
					const dayData = aggregations[year][month][day];
					const dayResult = {
						day: Number(day),
						date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
						videos: dayData.videos,
						size: dayData.size,
					};

					//@ts-ignore
					monthResult.days.push(dayResult);
					monthResult.videos += dayData.videos;
					monthResult.size += dayData.size;
				}

				//@ts-ignore
				yearResult.months.push(monthResult);
				yearResult.videos += monthResult.videos;
				yearResult.size += monthResult.size;
			}

			menu.push(yearResult);
		}

		return menu;
	}
}
