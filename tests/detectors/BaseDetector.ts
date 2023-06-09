import BaseDetector from "../../app/detectors/BaseDetector";

describe('Base Detector', () => {

	test('Get crop detection dimensions for inner box with zero border', () => {
		const boundingBox = [
			0.45, // x
			0.45, // y
			0.1, // width
			0.1, // height
		];
		const {
			leftWithBorder,
			topWithBorder,
			widthWithBorder,
			heightWithBorder,
		} = BaseDetector.getCropDetectionDimensions(1000, 500, boundingBox, 0);

		expect(leftWithBorder).toBe(450);
		expect(topWithBorder).toBe(225);
		expect(widthWithBorder).toBe(100);
		expect(heightWithBorder).toBe(50);
	});

	test('Get crop detection dimensions for box near left top corner', () => {
		const boundingBox = [
			0.05, // x
			0.05, // y
			0.1, // width
			0.1, // height
		];
		const {
			leftWithBorder,
			topWithBorder,
			widthWithBorder,
			heightWithBorder,
		} = BaseDetector.getCropDetectionDimensions(1000, 500, boundingBox, 100);

		expect(leftWithBorder).toBe(0);
		expect(topWithBorder).toBe(0);
		expect(widthWithBorder).toBe(300);
		expect(heightWithBorder).toBe(250);
	});

	test('Get crop detection dimensions for box near right bottom corner', () => {
		const boundingBox = [
			0.95, // x
			0.95, // y
			0.1, // width
			0.1, // height
		];
		const {
			leftWithBorder,
			topWithBorder,
			widthWithBorder,
			heightWithBorder,
		} = BaseDetector.getCropDetectionDimensions(1000, 500, boundingBox, 100);

		expect(leftWithBorder).toBe(850);
		expect(topWithBorder).toBe(375);
		expect(widthWithBorder).toBe(150);
		expect(heightWithBorder).toBe(125);
	});
});
