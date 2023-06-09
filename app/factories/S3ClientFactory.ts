import Configurator from "../components/Configurator";
import {S3Client} from "@aws-sdk/client-s3";
import {fromEnv} from "@aws-sdk/credential-providers";

export default class S3ClientFactory {

	static createInstance(configurator: Configurator): S3Client {
		const {region, endpoint} = configurator.parameters('s3') as Record<string, string>;
		return new S3Client({
			apiVersion: "2006-03-01",
			//signatureVersion: "v4",
			forcePathStyle: true,
			region,
			endpoint,
			credentials: fromEnv(),
		});
	}
}
