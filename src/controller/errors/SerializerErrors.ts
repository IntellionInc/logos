export class TypeMismatchError extends Error {
	name = "TypeMismatchError";
	constructor(key: string, expected: any, received: any) {
		super(
			`Expected ${key} to confirm to definition(s): "${expected}", but received "${received}"`
		);
	}
}

export class SerializationError extends Error {
	name = "SerializationError";
	constructor(errors: any[]) {
		super(errors.map(({ message, name }) => `${name}: ${message}`).join(", "));
	}
}
