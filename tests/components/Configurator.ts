/* eslint-disable no-console */

import 'jest';
import Configurator from '../../app/components/Configurator';

describe('Configurator', () => {
	process.env.TEST_TEST2_TEST3 = 'test value 3';
	process.env.TEST_TEST2_TEST4 = 'test value 4';
	process.env.TEST_TEST2_ENABLED = 'true';
	process.env.NUMBER = '1';

	class TestConfigurator extends Configurator {
		mapping = {
			'TEST_TEST2_TEST3': 'test.test2.test3',
			'TEST_TEST2_TEST4': 'test.test2.test4',
			'TEST_TEST2_ENABLED': 'test.test2.enabled',
			'NUMBER': 'number',
		};
	}

	test('Should set environment variables.', () => {
		const configurator = new TestConfigurator('../app/config/config.yml');
		configurator.selectAndApplyEnvParams();

		expect(configurator.parameters().number).toEqual(process.env.NUMBER);
		expect(configurator.parameters('test.test2.test3')).toEqual(process.env.TEST_TEST2_TEST3);
		expect(configurator.parameters('test.test2.test4')).toEqual(process.env.TEST_TEST2_TEST4);
		expect(configurator.parameters('test.test2.enabled')).toStrictEqual(true);
		expect(configurator.has('test.test2.enabled')).toBeTruthy();
		expect(configurator.has('test.test2.disabled')).toBeFalsy();
	});
});
