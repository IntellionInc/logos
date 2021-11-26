export class TypeMismatchError extends Error {
	name = "TypeMismatchError";
	constructor(key: string, expected: any, received: any) {
		super(`Expected ${key} to be ${expected.definition}, but received "${received}"`);
	}
}

export class SerializationError extends Error {
	name = "SerializationError";
	constructor(errors: any[]) {
		super(errors.map(({ message, name }) => `${name}: ${message}`).join(", "));
	}
}
