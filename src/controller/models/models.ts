export abstract class IntellionType {
	static hasSameTypeAs: (...args: any[]) => any;
	static definition: string;
}

export class String extends IntellionType {
	static hasSameTypeAs = (test: any) => typeof test === "string";
	static definition = "a string";
}
export class Email extends IntellionType {
	static hasSameTypeAs = (test: any) => typeof test === "string" && test.includes("@");
	static definition = "a string that contains an @ sign";
}
export class Number extends IntellionType {
	static hasSameTypeAs = (test: any) => typeof test === "number";
	static definition = "a number";
}
export class Phone extends IntellionType {
	static hasSameTypeAs = (test: any) => {
		if (typeof test !== "string") return false;
		return /^\+?[0-9]{7,15}$/.test(test);
	};
	static definition = "a phone number";
}
export class Boolean extends IntellionType {
	static hasSameTypeAs = (test: any) => typeof test === "boolean";
	static definition = "a boolean";
}

export class Date extends IntellionType {
	static hasSameTypeAs = (test: any) => {
		const parsed = global.Date.parse(test);
		return test instanceof global.Date || (parsed === parsed && typeof test !== "number");
	};
	static definition = "a date instance";
}

export class Array extends IntellionType {
	static hasSameTypeAs = (test: any) => global.Array.isArray(test);
	static definition = "an array";
}

export class Buffer extends IntellionType {
	static hasSameTypeAs = (test: any) => global.Buffer.isBuffer(test);
	static definition = "a buffer";
}

export class File extends IntellionType {
	static hasSameTypeAs = (test: any) => test instanceof global.File;
	static definition = "a file";
}

export const Enum = <T>(...args: T[]) =>
	class Enum extends IntellionType {
		static hasSameTypeAs = (test: any) => args.includes(test);
		static definition = `a ${typeof args[0]} from the following options: ${args.join(
			", "
		)}`;
	};
