import PromiseFtp from "promise-ftp";
import Configurator from "../components/Configurator";
import {Logger} from "winston";

export default class FtpClientFactory {
	static async createInstance(configurator: Configurator, logger: Logger): Promise<PromiseFtp> {
		const {host, user, password} = configurator.parameters('ftp') as Record<string, string>;

		const ftp = new PromiseFtp();

		const serverMessage = await ftp.connect({
			host: host,
			user: user,
			password: password,
			//@ts-ignore
			autoReconnect: true,
			debug: (message) => logger.silly(message),
		});

		logger.debug(serverMessage);

		return ftp;
	}
}
