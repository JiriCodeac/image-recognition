import fs from 'fs';
import path from 'path';

export default class Version {

	version = 'dev';
	buildDate: Date | null = null;
	buildTag: string | null = null;
	stable = false;

	constructor(basePath: string = path.resolve(__dirname + '/../../')) {
		const filePath = `${basePath || ''}/version.txt`;
		if (!fs.existsSync(filePath)) {
			return;
		}
		const lines = fs.readFileSync(filePath).toString().split(/\r?\n/),
			versionRe = /^VERSION=(.*)$/,
			buildDateRe = /^BUILD_DATE=(.*)$/,
			buildTagRe = /^BUILD_TAG=(.*)$/;
		lines.forEach(line => {
			if (versionRe.test(line)) {
				this.version = (line.match(versionRe) || [])[1];
			} else if (buildDateRe.test(line)) {
				this.buildDate = new Date((line.match(buildDateRe) || [])[1]);
			} else if (buildTagRe.test(line)) {
				this.buildTag = (line.match(buildTagRe) || [])[1];
			}
		});

		this.stable = Boolean(this.version.match(/v(\d+).(\d+).(\d+)$/g));
	}

	getVersion(): string {
		return this.version;
	}

	getBuildDate(): Date | null {
		return this.buildDate;
	}

	getBuildTag(): string | null {
		return this.buildTag;
	}

	isStable(): boolean {
		return this.stable;
	}
}
