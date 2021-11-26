import { TypeMismatchError, SerializationError } from "src/controller/errors";

describe("TypeMismatchError", () => {
	let uut: TypeMismatchError;
	const [key, expected, received] = [
		"some-key",
		{ definition: "some-definition" },
		{ some: "received" }
	];

	beforeEach(() => {
		uut = new TypeMismatchError(key, expected, received);
	});
	it("should be defined", () => {
		expect(uut).toBeDefined();
	});
	it("should extend default 'Error' class", () => {
		expect(uut).toBeInstanceOf(Error);
	});

	it("should have the correct error message", () => {
		const message =
			// eslint-disable-next-line quotes
			'Expected some-key to be some-definition, but received "[object Object]"';
		expect(uut.message).toBe(message);
	});
});

describe("SerializationError", () => {
	const mockErrors = [
		{ name: "some-error-1", message: "some-error-message-1" },
		{ name: "some-error-2", message: "some-error-message-2" }
	];

	let uut: SerializationError;
	beforeEach(() => {
		uut = new SerializationError(mockErrors);
	});

	it("should be defined", () => {
		expect(uut).toBeDefined();
	});
	it("should extend default 'Error' class", () => {
		expect(uut).toBeInstanceOf(Error);
	});

	it("should have the correct error message", () => {
		const message =
			"some-error-1: some-error-message-1, some-error-2: some-error-message-2";
		expect(uut.message).toBe(message);
	});
});
