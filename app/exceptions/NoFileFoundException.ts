export default class NoFileFoundException extends Error {
	constructor(public readonly path: string, message: any) {
		super(message);
	}
}
