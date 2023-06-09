module.exports = {
	verbose: true,
	collectCoverage: true,
	collectCoverageFrom: [
		'<rootDir>/app/**/*.ts',
	],
	coverageDirectory: 'log',
	coverageReporters: ['lcov', 'text', 'cobertura'],
	testMatch: [
		'<rootDir>/tests/**/*.ts',
	],
	testPathIgnorePatterns: [
		'<rootDir>/tests/testContainer.ts',
		'<rootDir>/tests/seedData.ts',
	],
	maxConcurrency: 1,
	transform: {
		"^.+\\.(ts)$": 'ts-jest',
	},
};
