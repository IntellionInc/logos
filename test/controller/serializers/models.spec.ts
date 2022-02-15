import * as Models from "src/controller/models";

type ModelName = "String" | "Email" | "Number" | "Boolean";

describe("IntellionType", () => {
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

[
	{
		name: "String",
		definition: "a string",
		match: "some-string",
		mismatch: 12345
	},
	{
		name: "Email",
		definition: "a string that contains an @ sign",
		match: "some-mail@",
		mismatch: "some-string"
	},
	{
		name: "Number",
		definition: "a number",
		match: 12345,
		mismatch: "some-string"
	},
	{
		name: "Boolean",
		definition: "a boolean",
		match: false,
		mismatch: "some-string"
	},
	{
		name: "Date",
		definition: "a boolean",
		match: new Date(1609459200000), // 2021-01-01
		mismatch: "Thu Jan 01 1970 02:00:00 GMT+0200 (GMT+03:00)"
	}
].forEach(({ name, definition, match, mismatch }) => {
	describe(name, () => {
		const uut = Models[name as ModelName];
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
				describe("when there is no type mismatch", () => {
					it("should return true", () => {
						expect(uut.hasSameTypeAs(match)).toBe(true);
					});
				});

				describe("when there is a type mismatch", () => {
					it("should return false", () => {
						expect(uut.hasSameTypeAs(mismatch)).toBe(false);
					});
				});
			});
		});
	});
});
