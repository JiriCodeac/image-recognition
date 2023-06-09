import {ContainerBuilder, YamlFileLoader} from 'node-dependency-injection';
import {join} from 'path';
import {S3Model} from "../app/models/S3Model";
import Configurator from "../app/components/Configurator";

export const containerBuilder = (testPrefix: string): ContainerBuilder => {
	//process.env.S3_BUCKET_ARCHIVE = testPrefix + 'archive';

	const srcDir = join(__dirname, '../app');
	const container = new ContainerBuilder(true, srcDir);

	const loader = new YamlFileLoader(container);
	loader.load(__dirname + '/../app/config/services.yml');
	container.compile();

	return container;
};

export const s3Setup = async (container: ContainerBuilder): Promise<void> => {
	const s3 = container.get<S3Model>('s3Model');
	const configurator = container.get<Configurator>('configurator');
	const buckets = configurator.parameters('s3.buckets') as Record<string, string>;

	await s3.createBucket(buckets.archive);
};

export const s3Teardown = async (container: ContainerBuilder): Promise<void> => {
	const s3 = container.get<S3Model>('s3Model');
	const configurator = container.get<Configurator>('configurator');
	const buckets = configurator.parameters('s3.buckets') as Record<string, string>;

	try {
		await s3.emptyBucket(buckets.archive);
	} catch(error) {
		console.warn(error);
	}
	await s3.deleteBucket(buckets.archive);
};
