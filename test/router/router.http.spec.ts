import http from "http";
import { AddressInfo } from "net";
import { once } from "events";
import express, { Request, Response, RequestHandler, ErrorRequestHandler } from "express";
import {
	BaseController,
	BaseDto,
	BaseSerializer,
	String as StringType
} from "src/controller";
import { Server } from "src/server";

class NameDto extends BaseDto {
	name = StringType;
}

class NameSerializer extends BaseSerializer {
	name = StringType;
}

class ContractError extends Error {
	status = 409;
}

const middleware: RequestHandler = (request, response, next) => {
	response.locals.order.push("controller");
	if (request.headers["x-stop"]) {
		response.status(202).json({ stopped: true });
		return;
	}
	next();
};

class ContractController extends BaseController {
	static MIDDLEWARES = [middleware];
	static _errorsDictionary = { ContractError };

	constructor(request: Request, response: Response) {
		super(request, response);
		response.locals.order.push("constructor");
		if (request.method === "POST") {
			this.Serializer = NameSerializer;
			this.serializes();
		}
	}

	inspect = async () => ({
		success: true,
		data: {
			params: this.request.params,
			order: this.response.locals.order,
			bodyDto: this.dtos.body === NameDto,
			queryDto: this.dtos.query === NameDto
		}
	});

	serialize = async () => {
		BaseDto.validate(this.dtos.body, this.request.body);
		return { data: this.request.body, success: true };
	};

	delayed = async () => {
		await new Promise(resolve => setTimeout(resolve, 15));
		return { data: { id: this.request.params.id }, success: true };
	};

	fail = async () => {
		const error = new ContractError("conflict");
		error.name = "ContractError";
		throw error;
	};
}

class ConstructorFailureController extends BaseController {
	constructor(request: Request, response: Response) {
		super(request, response);
		throw new ContractError("constructor failure");
	}
}

class RejectedController extends BaseController {
	exec = async (): Promise<never> => {
		throw new ContractError("execution failure");
	};
}

class RejectedMiddlewareController extends BaseController {
	static MIDDLEWARES: RequestHandler[] = [
		async () => {
			throw new ContractError("middleware failure");
		}
	];
}

class SentHeadersController extends BaseController {
	static MIDDLEWARES: RequestHandler[] = [
		async (request, response) => {
			response.status(202).end("already sent");
			throw new ContractError("after response");
		}
	];
}

const exchange = (
	server: http.Server,
	path: string,
	method = "GET",
	body?: string,
	headers: http.OutgoingHttpHeaders = {}
) =>
	new Promise<{ status: number; headers: http.IncomingHttpHeaders; text: string }>(
		(resolve, reject) => {
			const request = http.request(
				{
					host: "127.0.0.1",
					port: (server.address() as AddressInfo).port,
					path,
					method,
					headers
				},
				response => {
					const chunks: Buffer[] = [];
					response.on("data", chunk => chunks.push(chunk));
					response.on("error", reject);
					response.on("end", () =>
						resolve({
							status: response.statusCode,
							headers: response.headers,
							text: Buffer.concat(chunks).toString()
						})
					);
				}
			);
			request.on("error", reject);
			request.setTimeout(2000, () => request.destroy(new Error("HTTP test timed out")));
			request.end(body);
		}
	);

describe("Server HTTP routing contract", () => {
	let server: Server;
	const previousPort = process.env.PORT;
	const forwardedErrors: string[] = [];
	let finishHeadersError: () => void;

	beforeAll(async () => {
		process.env.PORT = "0";
		server = new Server()
			.useMiddleware([
				express.json(),
				(request: Request, response: Response, next: () => void) => {
					response.locals.order = ["global"];
					next();
				}
			])
			.useRouter(
				{
					"/api": {
						"/parents/:parentId": {
							"/options/:fieldName": { get: "ContractController => inspect" },
							"/:id": { get: "ContractController => inspect" },
							"/": { post: "ContractController => serialize" }
						},
						"/dto": { post: "ContractController => inspect" },
						"/delayed/:id": { get: "ContractController => delayed" },
						"/failure": { get: "ContractController => fail" },
						"/constructor-failure": { get: "ConstructorFailureController => inspect" },
						"/execution-failure": { get: "RejectedController => inspect" },
						"/middleware-failure": { get: "RejectedMiddlewareController => inspect" },
						"/sent-headers": { get: "SentHeadersController => inspect" }
					}
				},
				{
					ContractController,
					ConstructorFailureController,
					RejectedController,
					RejectedMiddlewareController,
					SentHeadersController
				},
				{
					ContractController: {
						inspect: { body: NameDto, query: NameDto },
						serialize: NameDto
					}
				}
			);
		await server.x;
		if (!server.server.listening) await once(server.server, "listening");
		const handleError: ErrorRequestHandler = (error, request, response, next) => {
			forwardedErrors.push(error.message);
			if (response.headersSent) {
				next(error);
				return;
			}
			response.status(error.status ?? 500).json({ error: error.message });
		};
		server.app.use(handleError);
		server.app.use(((error, request, response, next) => {
			forwardedErrors.push(`final: ${error.message}`);
			if (response.headersSent) {
				finishHeadersError();
				return;
			}
			next(error);
		}) as ErrorRequestHandler);
	});

	afterAll(async () => {
		if (previousPort === undefined) delete process.env.PORT;
		else process.env.PORT = previousPort;
		if (server?.server.listening) {
			await new Promise<void>((resolve, reject) =>
				server.server.close(error => (error ? reject(error) : resolve()))
			);
		}
	});

	it.each(["", "/"])(
		"merges nested parameters and preserves middleware order (%s)",
		async suffix => {
			const result = await exchange(server.server, `/api/parents/p1/child1${suffix}`);
			expect(result.status).toBe(200);
			expect(JSON.parse(result.text)).toEqual({
				success: true,
				data: {
					params: { parentId: "p1", id: "child1" },
					order: ["global", "controller", "constructor"],
					bodyDto: true,
					queryDto: true
				},
				status: 200,
				meta: {},
				error: null
			});
		}
	);

	it("keeps static branches ahead of parameterized routes", async () => {
		const result = await exchange(server.server, "/api/parents/p1/options/title");
		expect(JSON.parse(result.text).data.params).toEqual({
			parentId: "p1",
			fieldName: "title"
		});
	});

	it("constructs DTOs and serializes controller responses on root leaves", async () => {
		const result = await exchange(
			server.server,
			"/api/parents/p1",
			"POST",
			JSON.stringify({ name: "kept", extra: "removed" }),
			{ "content-type": "application/json" }
		);
		expect(result.status).toBe(200);
		expect(JSON.parse(result.text)).toEqual({
			data: { name: "kept" },
			success: true,
			status: 200,
			meta: {},
			error: null
		});
	});

	it("allows middleware to finish without constructing a controller", async () => {
		const result = await exchange(
			server.server,
			"/api/parents/p1/child1",
			"GET",
			undefined,
			{ "x-stop": "yes" }
		);
		expect(result.status).toBe(202);
		expect(JSON.parse(result.text)).toEqual({ stopped: true });
	});

	it("isolates overlapping controller executions", async () => {
		const results = await Promise.all(
			["first", "second", "third"].map(id =>
				exchange(server.server, `/api/delayed/${id}`)
			)
		);
		expect(results.map(result => JSON.parse(result.text).data.id)).toEqual([
			"first",
			"second",
			"third"
		]);
	});

	it("preserves controller-handled error status and response shape", async () => {
		const result = await exchange(server.server, "/api/failure");
		expect(result.status).toBe(409);
		expect(JSON.parse(result.text)).toMatchObject({
			success: false,
			data: null,
			error: "conflict",
			status: 409,
			meta: {}
		});
	});

	it.each([
		["constructor-failure", "constructor failure"],
		["execution-failure", "execution failure"],
		["middleware-failure", "middleware failure"]
	])("forwards %s to Express once", async (path, message) => {
		forwardedErrors.length = 0;
		const result = await exchange(server.server, `/api/${path}`);
		expect(result.status).toBe(409);
		expect(JSON.parse(result.text)).toEqual({ error: message });
		expect(forwardedErrors).toEqual([message]);
	});

	it("forwards errors after headers without sending a second response", async () => {
		forwardedErrors.length = 0;
		const forwarded = new Promise<void>(resolve => {
			finishHeadersError = resolve;
		});
		const result = await exchange(server.server, "/api/sent-headers");
		await forwarded;
		expect(result.status).toBe(202);
		expect(result.text).toBe("already sent");
		expect(forwardedErrors).toEqual(["after response", "final: after response"]);
	});

	it("supports HEAD and automatic OPTIONS", async () => {
		const head = await exchange(server.server, "/api/parents/p1/child1", "HEAD");
		expect(head.status).toBe(200);
		expect(head.text).toBe("");
		const options = await exchange(server.server, "/api/parents/p1/child1", "OPTIONS");
		expect(options.status).toBe(200);
		expect(options.headers.allow.split(/,\s*/).sort()).toEqual(["GET", "HEAD"]);
	});

	it.each([
		["/missing", "GET"],
		["/api/parents/p1/child1", "DELETE"]
	])("preserves 404s for %s %s", async (path, method) => {
		const result = await exchange(server.server, path, method);
		expect(result.status).toBe(404);
		expect(result.headers["content-type"]).toContain("text/html");
	});
});
