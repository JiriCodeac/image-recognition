export default class InvalidFilePathException extends Error {
	constructor(public readonly filepath: string, message: any) {
		super(message);
	}
}
