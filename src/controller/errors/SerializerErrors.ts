export class TypeMismatchError extends Error {
	name = "TypeMismatchError";
	constructor(key: string, expected: any, received: any) {
		super(
			`Expected ${key} to conform to definition(s): "${expected}", but received "${received}"`
		);
	}
}

export class SerializationError extends Error {
	name = "SerializationError";
	constructor(errors: Error[]) {
		super(errors.map(({ message, name }) => `${name}: ${message}`).join(", "));
	}
}
