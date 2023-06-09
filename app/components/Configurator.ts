import {load} from 'js-yaml';
import {mergeDeep, isObject} from './utils';
import {readFileSync} from 'fs';
import {resolve} from 'path';

export default class Configurator {

	config: {
		parameters: Record<string, any>,
	} = {
		parameters: {},
	};
	mapping: Record<string, string> = {
		ENVIRONMENT_IDENTIFIER: 'environmentIdentifier',
		S3_BUCKET_SOURCE: 's3.buckets.source',
		S3_BUCKET_RESULTS: 's3.buckets.results',
		S3_ENDPOINT: 's3.endpoint',

		FTP_HOST: 'ftp.host',
		FTP_USER: 'ftp.user',
		FTP_PASSWORD: 'ftp.password',

		DB_ENGINE: 'database.engine',
		DB_USER: 'database.user',
		DB_PASSWORD: 'database.password',
		DB_HOST: 'database.host',
		DB_NAME: 'database.dbName',
		DB_LOGGING_ENABLED: 'database.logging',

		LOGGER_LEVEL: 'logger.level',
	};

	constructor(filePath: string) {
		const absoluteFilePath = resolve(`${__dirname}/../${filePath}`);
		const fileContent = readFileSync(absoluteFilePath).toString();
		const config = load(fileContent);

		if (config && isObject(config) && Object.prototype.hasOwnProperty.call(config, 'parameters')) {
			// @ts-ignore
			this.config = config;
		}
	}

	/**
	 * Picks off parameters that are allowed in this.mapping.
	 * Passes each mapping key and value into applyEnvParam
	 * which attaches the value in to the position given by the mapping
	 */
	selectAndApplyEnvParams(): void {
		Object.keys(this.mapping).map((key: string) => {
			const value = process.env[key];
			if (typeof value !== 'undefined') {
				return this.applyEnvParam(key, value);
			}
		});
	}

	/**
	 * Takes a mapping key, and applies the supplied value
	 * into the position listed in the mapping
	 */
	private applyEnvParam(configKey: string, value: string | null): void {
		// split the config path defined in mapping into an array and reverse it so we build from the root value up
		const configTargetPath = this.mapping[configKey];
		if (typeof configTargetPath === 'undefined') {
			return;
		}

		const splitConfigTargetPath: Array<string> = configTargetPath.split('.').reverse();

		// build the object up from the innermost value
		const expandedConfigObject = splitConfigTargetPath.reduce((map: Record<string, unknown>, keyPathSegment: string, number: number) => {
			const obj: Record<string, any> = {};
			if (number === 0) {
				obj[keyPathSegment] = this.formatValueDataType(configKey, value);
			} else {
				obj[keyPathSegment] = map;
			}

			return obj;
		}, {});

		// merge values into params
		this.config.parameters = mergeDeep(this.config.parameters, expandedConfigObject);
	}

	private formatValueDataType(name: string, value: string | null): any {
		if (name.includes('_ENABLED')) {
			// Boolean
			return JSON.parse(String(value));
		}

		return value;
	}

	/**
	 * Gets either all params or, if passed a string as argument, a single value
	 * Will throw if the parameter is not present.
	 */
	parameters<T = any>(name: string | null = null): T {
		if (typeof this.config.parameters === 'undefined') {
			return {} as T;
		}

		if (!name) {
			return this.config.parameters as T;
		}

		const namePath = name.split('.');

		return this.getParameter(namePath);
	}

	/**
	 * Gets a single configuration value
	 */
	getParameter(namePath: Array<string>): any {
		let configStep = this.config.parameters;

		for (const step of namePath) {
			if (typeof configStep[step] === 'undefined') {
				throw new Error(`parameter \`${step}\` does not exist.`);
			}

			configStep = configStep[step];
		}

		return configStep;
	}

	/**
	 * Determines if a value is present or not
	 */
	has(name: string | null = null): boolean {
		try {
			this.parameters(name);
			return true;
		} catch (error) {
			return false;
		}
	}
}
