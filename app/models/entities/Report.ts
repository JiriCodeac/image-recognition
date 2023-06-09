import {BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table} from 'sequelize-typescript';
import humanizeDuration from 'humanize-duration';
import File from "./File";
import Frame from "./Frame";

export enum ReportType {
	WildLife = 'WildLife',
}

@Table({
	tableName: 'reports',
})
export default class Report extends Model {

	@ForeignKey(() => File)
	@Column(DataType.INTEGER)
	private fileId: number;

	@Column({
		defaultValue: ReportType.WildLife,
		type: DataType.ENUM(...Object.values(ReportType)),
	})
	private type: ReportType;

	@Column({
		type: DataType.DOUBLE,
		comment: 'Analysis length in milliseconds',
	})
	private duration: number;

	@Column({
		type: DataType.DOUBLE,
		comment: 'Average analysis time in milliseconds per frame',
	})
	private avgTimePerFrame: number;

	@HasMany(() => Frame)
	private frames: Frame[];

	@Column({
		type: DataType.TEXT,
		comment: 'Standard console output',
	})
	private output: string;

	@Column({
		type: DataType.TEXT,
		comment: 'Standard console errors',
	})
	private errors: string;

	@BelongsTo(() => File)
	private file: File;

	public getDurationFormatted() {
		//@ts-ignore
		return humanizeDuration(this.get('duration') / 1000, {
			round: true,
		});
	}
	public getAvgTimePerFrameFormatted() {
		//@ts-ignore
		return humanizeDuration(this.get('avgTimePerFrame'), {
			maxDecimalPoints: 1,
		});
	}
}
