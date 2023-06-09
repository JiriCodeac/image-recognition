export default class DetectionFailedException extends Error {
	constructor(private readonly directory: string, private readonly code: number, private readonly stdout: string, private readonly stderr: string) {
		super(`Detection failed with code ${code} for directory ${directory}.`);
	}
}
