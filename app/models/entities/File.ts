import {Column, DataType, HasMany, Model, Table} from 'sequelize-typescript';
import {filesize} from "filesize";
import humanizeDuration from 'humanize-duration';
import Report from "./Report";
import {formatDate} from "../../components/utils";

export enum FileType {
	VIDEO = 'VIDEO',
	IMAGE = 'IMAGE',
	OTHER = 'OTHER',
}

export const FILE_EXTENSIONS: Record<string, FileType> = {
	'mp4': FileType.VIDEO,
	'jpg': FileType.IMAGE,
};

@Table({
	tableName: 'files',
})
export default class File extends Model {
	@Column({
		type: DataType.STRING,
		comment: 'Original path from FTP storage',
	})
	//@Unique({name: 'File path', msg: 'Original file path'})
	path: string;

	@Column(DataType.DATE)
	captured: Date;

	@Column({
		defaultValue: FileType.OTHER,
		type: DataType.ENUM(...Object.values(FileType)),
	})
	type: FileType;

	@Column({
		type: DataType.DOUBLE,
		comment: 'Size of the file in bytes',
	})
	size: number;

	@Column({
		type: DataType.DOUBLE,
		allowNull: true,
		comment: 'Video duration in seconds',
	})
	length: number | null;

	@Column({
		type: DataType.STRING,
		comment: 'Name of the Camera',
	})
	source: string;

	@HasMany(() => Report)
	reports: Report[];

	public getSizeFormatted() {
		return filesize(this.get('size'), {
			base: 2,
			standard: "jedec",
		});
	}

	public getLengthFormatted() {
		//@ts-ignore
		return humanizeDuration(this.get('length') * 1000, {
			round: true,
		});
	}

	public getCapturedTime(): string {
		const captured = this.get('captured');
		return `${String(captured.getHours()).padStart(2, '0')}:${String(captured.getMinutes()).padStart(2, '0')}`;
	}

	public getCapturedDate(): string {
		const captured = this.get('captured');
		return formatDate(captured);
	}

	public getResultsPrefix(): string {
		const source = this.get('source');
		const captured = this.get('captured').toISOString();

		return `${source}/${captured}`;
	}
}
