import {exec, spawn, SpawnOptionsWithoutStdio} from 'child_process';
import {Logger} from "winston";

interface Result {
	code: number | null,
	stdout: string,
	stderr: string,
}

export class ChildProcess {
	static spawn(command: string, args: string[], basePath: string, logger: ((input: string) => void) | null = null): Promise<Result> {
		const options: SpawnOptionsWithoutStdio = {
			'cwd': basePath,
			'stdio': ['pipe', 'pipe', 'pipe', 'pipe'],
		};

		return new Promise((resolve, reject) => {
			let stdout = '';
			let stderr = '';

			try {
				const proc = spawn(command, args, options);

				proc.stdout.on('data', (data) => {
					if (logger) {
						const log = data.toString().replace('\n', '').trim();
						if (log) {
							logger(log);
						}
					}
					stdout += data.toString();
				});

				proc.stderr.on('data', (data) => {
					if (logger) {
						const log = data.toString().replace('\n', '').trim();
						if (log) {
							logger(log);
						}
					}
					stderr += data.toString();
				});

				proc.on('close', (code) => {
					resolve({
						code,
						stdout,
						stderr,
					});
				});
			} catch (exception) {
				reject(exception);
			}
		});
	}

	static exec(command: string): Promise<Result> {
		return new Promise((resolve, reject) => {
			let stdout = '';
			let stderr = '';

			const proc = exec(command);

			proc?.stdout?.on('data', (data) => {
				stdout += data.toString();
			});

			proc?.stderr?.on('data', (data) => {
				stderr += data.toString();
			});

			proc.on('message', (message) => {
				console.log(__filename, 'message', message); // eslint-disable-line no-console
			});

			proc.on('error', reject);
			proc.on('close', (code) => {
				resolve({
					code,
					stdout,
					stderr,
				});
			});
		});
	}
}
