import { BaseDto } from "src/controller/dtos";
import { Number, String } from "src/controller/models";
import { TypeMismatchError } from "src/controller";

jest.mock("../../../src/controller/errors", () => ({
	TypeMismatchError: jest.fn().mockReturnValue(Error("some-mismatch-error"))
}));

describe("BaseDto: ", () => {
	describe("dto validation", () => {
		let MockDtoInstance: typeof BaseDto;

		describe("when no properties are flexible", () => {
			beforeEach(() => {
				class MockDto extends BaseDto {
					key1 = String;
					key2 = String;
				}

				MockDtoInstance = MockDto;
			});

			describe("when all properties belong to correct types", () => {
				const input = { key1: "value1", key2: "value2" };
				const output = true;

				it("should validate the result", () => {
					const result = BaseDto.validate(MockDtoInstance, input);
					expect(result).toBe(output);
				});
			});

			describe("when some properties are wrongly typed", () => {
				const input = { key1: "value1", key2: 42 };

				it("should throw a 'TypeMismatchError'", () => {
					expect.assertions(2);

					try {
						BaseDto.validate(MockDtoInstance, input);
					} catch (err) {
						expect(err).toEqual(Error("some-mismatch-error"));
						expect(TypeMismatchError).toHaveBeenCalledWith("key2", String, 42);
					}
				});
			});

			describe("when some properties are missing", () => {
				const input = { key1: "value1" };

				it("should throw a 'TypeMismatchError'", () => {
					expect.assertions(2);

					try {
						BaseDto.validate(MockDtoInstance, input);
					} catch (err) {
						expect(err).toEqual(Error("some-mismatch-error"));
						expect(TypeMismatchError).toHaveBeenCalledWith("key2", String, undefined);
					}
				});
			});
		});

		describe("when some properties are flexible", () => {
			describe("when all properties belong to allowed types and none are undefined or null", () => {
				beforeEach(() => {
					class MockDto extends BaseDto {
						key1 = String;
						key2 = [String, Number];
					}

					MockDtoInstance = MockDto;
				});

				[
					{ value: "value2", type: "string" },
					{ value: 42, type: "number" }
				].forEach(({ value, type }) => {
					describe(`when the value is of type ${type} and the type is allowed`, () => {
						const input = { key1: "value1", key2: value };
						const output = true;

						it("should validate the result", () => {
							const result = BaseDto.validate(MockDtoInstance, input);
							expect(result).toBe(output);
						});
					});
				});
			});

			describe("when some properties are optional", () => {
				const input = { key1: "value1" };
				const output = true;

				beforeEach(() => {
					class MockDto extends BaseDto {
						key1 = String;
						key2 = [String, Number, undefined];
					}

					MockDtoInstance = MockDto;
				});

				it("should allow undefined properties to be undefined or null", () => {
					const result = BaseDto.validate(MockDtoInstance, input);
					expect(result).toBe(output);
				});
			});

			describe("when some properties are wrongly typed", () => {
				const input = { key1: "value1", key2: 42 };
				beforeEach(() => {
					class MockDto extends BaseDto {
						key1 = String;
						key2 = [String, undefined];
					}

					MockDtoInstance = MockDto;
				});
				it("should throw a 'TypeMismatchError'", () => {
					expect.assertions(2);

					try {
						BaseDto.validate(MockDtoInstance, input);
					} catch (err) {
						expect(err).toEqual(Error("some-mismatch-error"));
						expect(TypeMismatchError).toHaveBeenCalledWith(
							"key2",
							[String, undefined],
							42
						);
					}
				});
			});
		});
	});
});
