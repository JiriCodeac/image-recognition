export default class FileAlreadySkippedException extends Error {
	constructor(public readonly filepath: string) {
		super('The file was already skipped before');
	}
}
