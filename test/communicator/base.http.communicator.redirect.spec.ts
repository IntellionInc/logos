import http from "http";
import { AddressInfo } from "net";
import { once } from "events";
import followRedirects from "follow-redirects";
import { BaseHTTPCommunicator } from "src/communicator";

const credentials = {
	Authorization: "Bearer dummy-token",
	Cookie: "session=dummy-cookie",
	"Proxy-Authorization": "Basic ZHVtbXk6ZHVtbXk="
};

const echo: http.RequestListener = (request, response) => {
	const url = new URL(request.url, "http://127.0.0.1");
	const location = url.searchParams.get("redirect");
	if (location) {
		response.writeHead(302, { location }).end();
		return;
	}
	response.writeHead(Number(url.searchParams.get("status") ?? 200), {
		"content-type": "application/json"
	});
	response.end(JSON.stringify(request.headers));
};

const listen = async () => {
	const server = http
		.createServer({ requireHostHeader: false }, echo)
		.listen(0, "127.0.0.1");
	await once(server, "listening");
	return server;
};

const portOf = (server: http.Server) => (server.address() as AddressInfo).port;

describe("BaseHTTPCommunicator redirects", () => {
	let origin: http.Server;
	let target: http.Server;
	let errorHandler: jest.Mock;
	let communicator: BaseHTTPCommunicator;

	const crossOrigin = (query = "") =>
		`/?redirect=${encodeURIComponent(`http://127.0.0.1:${portOf(target)}/${query}`)}`;
	const sameOrigin = "/?redirect=%2F";

	const request = (path: string, options: Record<string, any>) =>
		new Promise<http.IncomingHttpHeaders>((resolve, reject) => {
			followRedirects.http
				.request(
					{ hostname: "127.0.0.1", port: portOf(origin), path, ...options },
					response => {
						const chunks: Buffer[] = [];
						response.on("data", chunk => chunks.push(chunk));
						response.on("end", () =>
							resolve(JSON.parse(Buffer.concat(chunks).toString()))
						);
					}
				)
				.on("error", reject)
				.end();
		});

	beforeAll(async () => {
		origin = await listen();
		target = await listen();
	});

	afterAll(async () => {
		await Promise.all(
			[origin, target].map(
				server => new Promise(resolve => server.close(resolve).closeAllConnections())
			)
		);
	});

	beforeEach(() => {
		errorHandler = jest.fn(error => ({ failed: error.response?.status ?? error.name }));
		communicator = new BaseHTTPCommunicator(
			{
				baseURL: `http://127.0.0.1:${portOf(origin)}`,
				timeout: 2000,
				headers: { ...credentials, "X-Trace-Id": "dummy-trace" }
			},
			errorHandler
		);
		communicator.axios.defaults.proxy = false;
	});

	it("strips credentials and keeps ordinary headers on a cross-origin redirect", async () => {
		const headers = await communicator.get(crossOrigin());

		expect(headers["x-trace-id"]).toBe("dummy-trace");
		expect(headers).not.toHaveProperty("authorization");
		expect(headers).not.toHaveProperty("cookie");
		expect(headers).not.toHaveProperty("proxy-authorization");
		expect(errorHandler).not.toHaveBeenCalled();
	});

	it("keeps credentials except Proxy-Authorization on a same-origin redirect", async () => {
		const headers = await communicator.get(sameOrigin, {
			headers: { "X-Api^Key": "dummy-declared" },
			sensitiveHeaders: ["X-Api^Key"]
		});

		expect(headers).toMatchObject({
			authorization: credentials.Authorization,
			cookie: credentials.Cookie,
			"x-trace-id": "dummy-trace",
			"x-api^key": "dummy-declared"
		});
		expect(headers).not.toHaveProperty("proxy-authorization");
	});

	it("strips only the custom headers declared sensitive", async () => {
		const headers = await communicator.get(crossOrigin(), {
			headers: { "X-Api^Key": "dummy-declared", "X-Api-Key": "dummy-undeclared" },
			sensitiveHeaders: ["X-Api^Key"]
		});

		expect(headers).not.toHaveProperty("x-api^key");
		expect(headers["x-api-key"]).toBe("dummy-undeclared");
	});

	it("passes a redirected error response to the error handler", async () => {
		const result = await communicator.get(crossOrigin("?status=503"));

		expect(result).toEqual({ failed: 503 });
		expect(errorHandler).toHaveBeenCalledTimes(1);
		const [{ response }] = errorHandler.mock.calls[0];
		expect(response.data["x-trace-id"]).toBe("dummy-trace");
		expect(response.data).not.toHaveProperty("authorization");
	});

	it("rejects array-form headers before sending them", async () => {
		const result = await communicator.get(sameOrigin, {
			headers: ["Authorization", credentials.Authorization]
		});

		expect(result).toEqual({ failed: "TypeError" });
		expect(errorHandler).toHaveBeenCalledWith(expect.any(TypeError));
	});

	describe("follow-redirects transport", () => {
		const arrayHeaders = [
			...Object.entries(credentials).flat(),
			"X-Trace-Id",
			"dummy-trace"
		];

		it("strips array-form credentials on a cross-origin redirect", async () => {
			const headers = await request(crossOrigin(), { headers: arrayHeaders });

			expect(headers["x-trace-id"]).toBe("dummy-trace");
			expect(headers).not.toHaveProperty("authorization");
			expect(headers).not.toHaveProperty("cookie");
			expect(headers).not.toHaveProperty("proxy-authorization");
		});

		it("keeps array-form credentials on a same-origin redirect", async () => {
			const headers = await request(sameOrigin, { headers: arrayHeaders });

			expect(headers).toMatchObject({
				authorization: credentials.Authorization,
				cookie: credentials.Cookie,
				"proxy-authorization": credentials["Proxy-Authorization"],
				"x-trace-id": "dummy-trace"
			});
		});

		const declared = () => ({
			headers: {
				"X-Api^Key": "dummy-caret",
				"X-Token|Secret": "dummy-pipe",
				"X-Token": "dummy-ordinary"
			},
			sensitiveHeaders: ["X-Api^Key", "X-Token|Secret"]
		});

		it("strips declared sensitive headers containing regex metacharacters", async () => {
			const headers = await request(crossOrigin(), declared());

			expect(headers).not.toHaveProperty("x-api^key");
			expect(headers).not.toHaveProperty("x-token|secret");
			expect(headers["x-token"]).toBe("dummy-ordinary");
		});

		it("keeps declared sensitive headers on a same-origin redirect", async () => {
			const headers = await request(sameOrigin, declared());

			expect(headers).toMatchObject({
				"x-api^key": "dummy-caret",
				"x-token|secret": "dummy-pipe",
				"x-token": "dummy-ordinary"
			});
		});
	});
});
