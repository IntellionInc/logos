import { BaseSerializer } from "src/controller/serializers";
import { Email, Number, String } from "src/controller/models";
import { TypeMismatchError, SerializationError } from "src/controller";

jest.mock("../../../src/controller/errors", () => ({
	TypeMismatchError: jest.fn().mockReturnValue(Error("some-mismatch-error")),
	SerializationError: jest.fn().mockReturnValue(Error("some-serialization-error"))
}));

describe("BaseSerializer: ", () => {
	describe("serialization", () => {
		let mockInput: Record<any, any>;
		let MockSerializerInstance: typeof BaseSerializer;

		describe("when some property values cannot be fetched", () => {
			let mockGetter: jest.Mock;
			mockInput = {
				key1: "value1",
				key2: "value2"
			};

			beforeEach(() => {
				mockGetter = jest.fn().mockRejectedValueOnce({ some: "value" });
				class MockSerializer extends BaseSerializer {
					key1 = String;
					key2 = String;

					public get someProperty() {
						return mockGetter();
					}
				}
				MockSerializerInstance = MockSerializer;
			});

			it("should throw a 'SerializationError", async () => {
				expect.assertions(1);
				try {
					await BaseSerializer.serialize(MockSerializerInstance, mockInput);
				} catch (err) {
					expect(err).toEqual(Error("some-serialization-error"));
				}
			});
		});

		describe("when all properties can be fetched", () => {
			describe("when no properties are flexible", () => {
				describe("when all properties belong to correct types", () => {
					describe("when there are getters", () => {
						let mockGetter: jest.Mock;

						const mockFetchedResult = { some: "getter-result" };
						const input = {
							key1: "value1",
							key2: "value2",
							key3: "value3"
						};
						const output = {
							key1: "value1",
							key2: "value2",
							someProperty: mockFetchedResult
						};

						beforeEach(() => {
							mockGetter = jest.fn().mockReturnValueOnce(mockFetchedResult);
							class MockSerializer extends BaseSerializer {
								key1 = String;
								key2 = String;

								public get someProperty() {
									return mockGetter();
								}
							}
							MockSerializerInstance = MockSerializer;
						});

						it("should return the serialized result along with getter values", async () => {
							const result = await BaseSerializer.serialize(
								MockSerializerInstance,
								input
							);
							expect(result).toEqual(output);
						});
					});

					describe("when there are no getters", () => {
						const input = { key1: "value1", key2: "value2", key3: "value3" };
						const output = { key1: "value1", key2: "value2" };

						beforeEach(() => {
							class MockSerializer extends BaseSerializer {
								key1 = String;
								key2 = String;
							}
							MockSerializerInstance = MockSerializer;
						});

						it("should return the serialized result", async () => {
							const result = await BaseSerializer.serialize(
								MockSerializerInstance,
								input
							);
							expect(result).toEqual(output);
						});
					});
				});

				describe("when some properties are wrongly typed", () => {
					const input = { key1: "value1", key2: 42 };

					beforeEach(() => {
						class MockSerializer extends BaseSerializer {
							key1 = String;
							key2 = String;
						}
						MockSerializerInstance = MockSerializer;
					});

					it("should throw a 'TypeMismatchError'", async () => {
						expect.assertions(3);

						try {
							await BaseSerializer.serialize(MockSerializerInstance, input);
						} catch (err) {
							expect(err).toEqual(Error("some-serialization-error"));
							expect(TypeMismatchError).toHaveBeenCalledWith(
								"key2",
								String.definition,
								42
							);
							expect(SerializationError).toHaveBeenCalledWith([
								Error("some-mismatch-error")
							]);
						}
					});
				});

				describe("when some properties are missing", () => {
					const input = { key1: "value1", key3: "value3" };

					beforeEach(() => {
						class MockSerializer extends BaseSerializer {
							key1 = String;
							key2 = String;
						}
						MockSerializerInstance = MockSerializer;
					});

					it("should throw a 'TypeMismatchError'", async () => {
						expect.assertions(2);

						try {
							await BaseSerializer.serialize(MockSerializerInstance, input);
						} catch (err) {
							expect(err).toEqual(Error("some-serialization-error"));
							expect(TypeMismatchError).toHaveBeenCalledWith(
								"key2",
								String.definition,
								undefined
							);
						}
					});
				});
			});

			describe("when some properties are flexible", () => {
				describe("when no properties are related to getters", () => {
					describe("when all the properties belong to allowed types and none are undefined or null", () => {
						beforeEach(() => {
							class MockSerializer extends BaseSerializer {
								key1 = String;
								key2 = [String, Number];
							}
							MockSerializerInstance = MockSerializer;
						});

						const serializerCases = [
							{ value: "value2", type: "string" },
							{ value: 42, type: "number" }
						];

						describe.each(serializerCases)(
							"when the value is of type $type and the type is allowed",
							({ value }) => {
								const input = { key1: "value1", key2: value, key3: "value3" };
								const output = { key1: "value1", key2: value };

								it("should return the serialized result", async () => {
									const result = await BaseSerializer.serialize(
										MockSerializerInstance,
										input
									);
									expect(result).toEqual(output);
								});
							}
						);
					});

					describe("when some properties are optional", () => {
						const input = { key1: "value1" };
						const output = { key1: "value1", key2: null };

						beforeEach(() => {
							class MockSerializer extends BaseSerializer {
								key1 = String;
								key2 = [String, Number, undefined];
							}
							MockSerializerInstance = MockSerializer;
						});

						it("should allow the optional properties to be undefined or null", async () => {
							const result = await BaseSerializer.serialize(
								MockSerializerInstance,
								input
							);
							expect(result).toEqual(output);
						});
					});
				});

				describe("when some properties are related to getters", () => {
					let mockGetter: jest.Mock;

					const getterArray = ["some-value", 1, { some: "thing" }];
					const input = { key1: "value1" };
					const output = { key1: "value1", key2: null, someProperty: getterArray };

					beforeEach(() => {
						mockGetter = jest.fn().mockReturnValueOnce(getterArray);
						class MockSerializer extends BaseSerializer {
							key1 = String;
							key2 = [String, Number, undefined];

							public get someProperty() {
								return mockGetter();
							}
						}
						MockSerializerInstance = MockSerializer;
					});

					it("should not include getter returns in the type checking", async () => {
						const result = await BaseSerializer.serialize(MockSerializerInstance, input);
						expect(result).toEqual(output);
					});
				});

				describe("when some properties are wrongly typed", () => {
					const input = { key1: "value1", key2: 42 };
					const errorMessageDefinition = "a string, a string that contains an @ sign";

					beforeEach(() => {
						class MockSerializer extends BaseSerializer {
							key1 = String;
							key2 = [String, Email];
						}
						MockSerializerInstance = MockSerializer;
					});

					it("should throw the appropriate error", async () => {
						expect.assertions(3);

						try {
							await BaseSerializer.serialize(MockSerializerInstance, input);
						} catch (err) {
							expect(err).toEqual(Error("some-serialization-error"));
							expect(TypeMismatchError).toHaveBeenCalledWith(
								"key2",
								errorMessageDefinition,
								42
							);
							expect(SerializationError).toHaveBeenCalledWith([
								Error("some-mismatch-error")
							]);
						}
					});
				});

				describe("when some optional properties are wrongly typed", () => {
					const input = { key1: "value1", key2: 42 };
					const errorMessageDefinition = "a string, not defined";

					beforeEach(() => {
						class MockSerializer extends BaseSerializer {
							key1 = String;
							key2 = [String, undefined];
						}
						MockSerializerInstance = MockSerializer;
					});

					it("should throw the appropriate error", async () => {
						expect.assertions(3);

						try {
							await BaseSerializer.serialize(MockSerializerInstance, input);
						} catch (err) {
							expect(err).toEqual(Error("some-serialization-error"));
							expect(TypeMismatchError).toHaveBeenCalledWith(
								"key2",
								errorMessageDefinition,
								42
							);
							expect(SerializationError).toHaveBeenCalledWith([
								Error("some-mismatch-error")
							]);
						}
					});
				});
			});

			describe("when the input is an array", () => {
				let mockGetter: jest.Mock;

				const mockFetchedResult = { some: "getter-result" };
				const input = [
					{ key1: "value11", key2: "value21" },
					{ key1: "value12", key2: "value22", key3: "value32" }
				];
				const output = [
					{ key1: "value11", key2: "value21", someProperty: { some: "getter-result" } },
					{ key1: "value12", key2: "value22", someProperty: { some: "getter-result" } }
				];

				beforeEach(() => {
					mockGetter = jest.fn().mockReturnValue(mockFetchedResult);
					class MockSerializer extends BaseSerializer {
						key1 = String;
						key2 = String;

						public get someProperty() {
							return mockGetter();
						}
					}
					MockSerializerInstance = MockSerializer;
				});
				it("should return the serialized results in an array", async () => {
					const result = await BaseSerializer.serialize(MockSerializerInstance, input);
					expect(result).toEqual(output);
				});
			});
		});
	});
});
