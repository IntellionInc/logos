import * as Models from "src/controller/models";

type TypeName = "String" | "Email" | "Number" | "Boolean" | "Date" | "Array";

describe("IntellionType: ", () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	describe("class constructor", () => {
		class MockIntellionType extends Models.IntellionType {
			static hasSameTypeAs = jest.fn();
			static definition = "some-definition";
		}

		const uut = MockIntellionType;

		it("should be defined", () => {
			expect(uut).toBeDefined();
		});

		it("should have correct properties", () => {
			expect(uut).toHaveProperty("definition");
			expect(uut).toHaveProperty("hasSameTypeAs");
		});
	});
});

const testedTypes = [
	{
		typeName: "String",
		definition: "a string",
		match: "some-string",
		mismatch: 12345
	},
	{
		typeName: "Email",
		definition: "a string that contains an @ sign",
		match: "some-mail@",
		mismatch: "some-string"
	},
	{
		typeName: "Number",
		definition: "a number",
		match: 12345,
		mismatch: "some-string"
	},
	{
		typeName: "Boolean",
		definition: "a boolean",
		match: false,
		mismatch: "some-string"
	},
	{
		typeName: "Date",
		definition: "a date instance",
		match: new Date(1609459200000), // 2021-01-01
		mismatch: "this is not a date"
	},
	{
		typeName: "Date",
		definition: "a date instance",
		match: "Thu Jan 01 1970 02:00:00 GMT+0200 (GMT+03:00)", // 2021-01-01
		mismatch: "we're only friends"
	},
	{
		typeName: "Date",
		definition: "a date instance",
		match: new Date(1609459200000), // 2021-01-01
		mismatch: 3
	},
	{
		typeName: "Array",
		definition: "an array",
		match: ["element1", "element2"],
		mismatch: 424242
	}
];

describe.each(testedTypes)("$typeName: ", ({ typeName, definition, match, mismatch }) => {
	const uut = Models[typeName as TypeName];
	const instance = new uut();

	it("should extend 'IntellionType", () => {
		expect(instance).toBeInstanceOf(Models.IntellionType);
	});

	describe("class properties", () => {
		describe("definition", () => {
			it("should have the correct description", () => {
				expect(uut.definition).toBe(definition);
			});
		});

		describe("hasSameTypeAs", () => {
			it(`should return true when provided with '${match}'`, () => {
				expect(uut.hasSameTypeAs(match)).toBe(true);
			});

			it(`should return false when provided with '${mismatch}'`, () => {
				expect(uut.hasSameTypeAs(mismatch)).toBe(false);
			});
		});
	});
});
