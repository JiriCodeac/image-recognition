export enum DetectionType {
	Animal = 1,
	Person = 2,
	Vehicle = 3,
}

export interface WildLifeDetection {
	boundingBox: number[],
	category: DetectionType,
	confidence: number,
}

export interface WildLifeFrame {
	detections: WildLifeDetection[],
	duration: number,
	file: string,
	timestamp: number,
	height: number,
	width: number,
	maxDetectionConfidence: number,
	failure?: string,
}

export default interface WildLifeDetections {
	avgTime: number,
	videoLength: number,
	frames: WildLifeFrame[],
	output: string,
	errors: string,
	crops: Record<string, string>,
}
