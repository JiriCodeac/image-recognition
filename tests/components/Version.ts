import fs from 'fs';

import Version from '../../app/components/Version';

const STAGING_VERSION = 'VERSION=v1.3.273-14-gae71e82\n' +
	'BUILD_DATE=2020-03-03T12:33:03Z\n' +
	'BUILD_TAG=xyz\n';

const PRODUCTION_VERSION = 'VERSION=v1.3.273\n' +
	'BUILD_DATE=2020-03-03T12:31:03Z\n' +
	'BUILD_TAG=abc\n';

const PATH = __dirname,
	FILE = PATH + '/version.txt';

describe('Version', () => {

	test('Dev version', () => {
		const version = new Version(PATH);

		expect(version.getVersion()).toEqual('dev');
		expect(version.getBuildDate()).toBeNull();
		expect(version.getBuildTag()).toBeNull();
		expect(version.isStable()).toBeFalsy();
	});

	test('Staging version', () => {
		fs.writeFileSync(FILE, STAGING_VERSION);
		const version = new Version(PATH);

		expect(version.getVersion()).toEqual('v1.3.273-14-gae71e82');
		expect(version.getBuildDate()).not.toBeNull();
		expect(version.getBuildDate()?.getTime()).toEqual((new Date('2020-03-03T12:33:03Z')).getTime());
		expect(version.getBuildTag()).toEqual('xyz');
		expect(version.isStable()).toBeFalsy();

		fs.unlinkSync(FILE);
	});

	test('Production version', () => {
		fs.writeFileSync(FILE, PRODUCTION_VERSION);
		const version = new Version(PATH);

		expect(version.getVersion()).toEqual('v1.3.273');
		expect(version.getBuildDate()).not.toBeNull();
		expect(version.getBuildDate()?.getTime()).toEqual((new Date('2020-03-03T12:31:03Z')).getTime());
		expect(version.getBuildTag()).toEqual('abc');
		expect(version.isStable()).toBeTruthy();

		fs.unlinkSync(FILE);
	});
});
