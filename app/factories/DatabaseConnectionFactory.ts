import {Sequelize} from 'sequelize-typescript';

import Configurator from '../components/Configurator';
import {SequelizeOptions} from "sequelize-typescript/dist/sequelize/sequelize/sequelize-options";
import {Dialect} from "sequelize";
import {ModelOptions} from "sequelize/types/model";
import {PoolOptions} from "sequelize/types/sequelize";
import {Logger} from "winston";

export default class DatabaseConnectionFactory {
	static createConnection(configurator: Configurator, logger: Logger) {
		const config: {
			dbName: string,
			host: string,
			user: string,
			password: string,
			engine: 'mysql',
			logging: boolean,
		} = configurator.parameters('database');

		const dialect: Dialect = config.engine;
		const define: ModelOptions = {
			timestamps: true,
		};
		const pool: PoolOptions = {
			max: 10,
			min: 1,
			acquire: 60000,
			idle: 10000,
		};

		const properties: SequelizeOptions = {
			host: config.host,
			dialect,
			dialectOptions: { // https://github.com/mysqljs/mysql#connection-options
				charset: 'utf8mb4',
				supportBigNumbers: true,
				bigNumberStrings: true,
			},
			define,
			pool,
			logging: config.logging ? (message) => logger.debug(message) : false,
			repositoryMode: true,
			models: [__dirname + '/../models/entities'],
		};

		return new Sequelize(config.dbName, config.user, config.password, properties);
	}
}
