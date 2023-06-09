import {containerBuilder} from "../testContainer";
import {FtpModel} from "../../app/models/FtpModel";
import PromiseFtp from "promise-ftp";
import {streamToBuffer} from "../../app/components/utils";

describe('FTP Model', () => {
	const container = containerBuilder('ftp-model-');
	const ftpModel = container.get<FtpModel>('ftpModel');
	const ftpClient = container.get<Promise<PromiseFtp>>('ftpClient');

	afterAll(async () => {
		await (await ftpClient).end();
	})

	test('test write, list nd delete a file', async () => {
		const fileContent = 'Hello!';
		const fileName = '/test/test.txt';
		await ftpModel.makeDirectory('/test');
		await ftpModel.upload(fileName, fileContent);
		const content = await ftpModel.getFile(fileName);

		expect((await streamToBuffer(content)).toString("utf-8")).toBe(fileContent);

		const list = await ftpModel.listAllFilePaths();

		expect(list.length).toBeGreaterThan(0);
		expect(list).toContain(fileName);

		await ftpModel.delete(fileName);

		const list2 = await ftpModel.listAllFilePaths();
		expect(list2).not.toContain(fileName);
	}, 20_000);
});
