import {BelongsTo, Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';
import Report from "./Report";
import {DetectionType, WildLifeDetection} from "../../types/WildLifeDetections";
import File from "./File";

@Table({
	tableName: 'frames',
})
export default class Frame extends Model {

	@ForeignKey(() => Report)
	@Column(DataType.INTEGER)
	private reportId: number;

	@Column({
		type: DataType.DOUBLE,
		comment: 'timestamp of frames',
	})
	private timestamp: number;

	@Column({
		type: DataType.INTEGER,
	})
	private height: number;

	@Column({
		type: DataType.INTEGER,
	})
	private width: number;

	@Column({
		type: DataType.DOUBLE,
		comment: 'Most confident results',
	})
	private maxDetectionConfidence: number;

	@Column({
		type: DataType.JSON,
		comment: 'List of uniquely detected categories',
	})
	private detectedCategories: number[] | null = null;

	@Column({
		type: DataType.JSON,
		comment: 'Analysis failed',
	})
	private errors: string;

	@Column({
		type: DataType.JSON,
		comment: 'Analysis results',
	})
	private detections: WildLifeDetection[];

	@Column({
		type: DataType.DOUBLE,
		comment: 'Analysis time in milliseconds',
	})
	private duration: number;

	@BelongsTo(() => Report)
	private report: Report;

	public getDetectionsFormatted(report: Report | null = null, file: File | null = null) {
		const detections = JSON.parse(String(this.get('detections'))) as WildLifeDetection[];

		if (!report) {
			report = this.get('report') as Report;
		}

		if (!file) {
			file = report.get('file') as File;
		}

		const timestamp = this.get('timestamp');
		const output = [];

		for (const detectionId in detections) {
			const detection = detections[detectionId];
			const categoryId = Number(detection.category);
			const confidenceLevel: string = this.getConfidenceLevel(detection.confidence);

			const imagePath = `${file.getResultsPrefix()}/${timestamp}-${detectionId}.jpg`;

			output.push({
				...detection,
				confidencePercentage: Math.round(detection.confidence * 1000) / 10,
				confidenceLevel,
				categoryId,
				category: DetectionType[categoryId],
				detectionId: Number(detectionId),
				imagePath,
			});
		}

		return output;
	}

	protected getConfidenceLevel(confidence: number): string {
		if (confidence > 0.8) {
			return 'success';
		}

		if (confidence > 0.4) {
			return 'warning';
		}

		return 'danger';
	}
}
