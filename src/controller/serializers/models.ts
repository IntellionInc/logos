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

export class Boolean extends IntellionType {
	static hasSameTypeAs = (test: any) => typeof test === "boolean";
	static definition = "a boolean";
}
