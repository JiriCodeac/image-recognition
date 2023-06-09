import winston, {Logger} from 'winston';
import Configurator from "../components/Configurator";

export default class LoggerFactory {
	static createInstance(configurator: Configurator): Logger {
		return winston.createLogger({
			transports: [
				new winston.transports.Console({
					level: configurator.parameters('logger.level'),
				}),
			],
		});
	}
}
