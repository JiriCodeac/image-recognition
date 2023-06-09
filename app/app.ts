import {ContainerBuilder, YamlFileLoader} from 'node-dependency-injection';
import * as winston from 'winston';
import {join} from 'path';
import express, {Request, Response} from 'express';
import expressMonitor from 'express-status-monitor';
//@ts-ignore
import expressNunjucks from 'express-nunjucks';
import basicAuth from 'express-basic-auth';
import i18n from 'i18n';
import {filesize} from "filesize";

import Router from "./router";
import {badRequest, internalServerError, validatorError} from './components/responses';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';
import AnalysisController from "./controllers/AnalysisController";

const srcDir = join(__dirname);
const container = new ContainerBuilder(true, srcDir);
container.logger = winston;

const loader = new YamlFileLoader(container);
loader.load(__dirname + '/config/services.yml');

container.compile();

const analysisController = container.get<AnalysisController>('analysisController');
const app = express();
app.use(expressMonitor({
	healthChecks: [{
		protocol: 'http',
		host: 'localhost',
		path: '/v1/health-check',
		port: '4000',
	}],
}));
app.use(express.json({strict: false}));
app.use(express.text());
app.use(express.urlencoded({extended: false}));
app.use(cors({
	// ToDo: Unsecure
	origin: '*',
}));

app.use(basicAuth({
	challenge: true,
	users: {
		'michal': '7894561230',
		'alan': 'alan',
		'sylva': 'sylva',
	},
}));

i18n.configure({
	locales: ['cs', 'en'],
	cookie: 'lang',
	directory: __dirname + '/locales',
});

app.use(i18n.init);

app.set('views', __dirname + '/views');

const njk = expressNunjucks(app, {
	noCache: true,
});

njk.env.addGlobal("__", i18n.__);
njk.env.addFilter("t", i18n.__);
njk.env.addFilter('filesize', (size: number) => {
	return filesize(size, {
		base: 2,
		standard: "jedec",
	});
});

app.use(OpenApiValidator.middleware({
	apiSpec: join(__dirname, 'config/api/openapi.yml'),
	validateRequests: true,
	validateResponses: {
		removeAdditional: true,
		onError(err: unknown, _body: unknown, req: Request) {
			//@ts-ignore
			internalServerError(req, req.res, err);
		},
	},
}));

// Do not remove fourth parameter, it is important.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: () => void) => {
	for (const ValidatorError of Object.values(OpenApiValidator.error)) {
		if (err && err instanceof ValidatorError) {
			//@ts-ignore
			validatorError(req, res, err);
			return;
		}
	}
	badRequest(req, res, String(err));
});

const router: Router = new Router(container);
app.use('/', router.getRestRouter());

analysisController.actionDefault();

export default app;
