export default class NotEnoughFramesForAnalysisException extends Error {
	constructor(public readonly filepath: string, message: any) {
		super(message);
	}
}
