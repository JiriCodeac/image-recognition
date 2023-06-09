import {Request, Response} from "express";
import {HttpError} from "express-openapi-validator/dist/framework/types";

function errorBody(statusCode: number, statusName: string, errorMessage: string, request: Request) {
	return {
		timestamp: new Date(),
		status: statusCode,
		error: statusName,
		message: errorMessage,
		path: request.path,
	};
}

export function ok(request: Request, response: Response, body: unknown, code = 200): void {
	response.status(code);
	if (body) {
		response.json(body);
	} else {
		response.json();
	}
}

export function notFound(request: Request<any>, response: Response, notFoundMessage: string): void {
	response.status(404).json(
		errorBody(404, 'Not Found', notFoundMessage, request),
	);
}

export function validatorError(request: Request, response: Response, error: HttpError): void {
	for (const [name, value] of Object.entries(error.headers ?? {})) {
		response.header(name, value);
	}
	response.status(error.status).json(
		errorBody(error.status, error.name, error.message, request),
	);
}

export function badRequest(request: Request, response: Response, errorMessage: string): void {
	response.status(400).json(
		errorBody(400, 'Bad Request', errorMessage, request),
	);
}

export function unauthenticated(request: Request, response: Response, errorMessage: string): void {
	response.status(401).json(
		errorBody(401, 'Missing or invalid authentication', errorMessage, request),
	);
}

export function forbidden(request: Request, response: Response, errorMessage: string): void {
	response.status(403).json(
		errorBody(403, 'Forbidden', errorMessage, request),
	);
}

export function internalServerError(request: Request, response: Response, error: unknown): void {
	console.error(error);
	const errorMessage = String(error);
	response.status(500).json(
		errorBody(500, 'Internal Server Error', errorMessage, request),
	);
}

export function notImplemented(request: Request, response: Response): void {
	const errorMessage = "Requested function is not implemented";
	response.status(501).json(
		errorBody(501, "Not Implemented", errorMessage, request),
	);
}
