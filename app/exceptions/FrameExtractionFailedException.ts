export default class FrameExtractionFailedException extends Error {
	constructor(public readonly filepath: string, public readonly destination: string, message: string) {
		super(message);
	}
}
