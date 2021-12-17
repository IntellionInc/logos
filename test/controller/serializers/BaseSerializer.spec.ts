import { BaseSerializer } from "src/controller/serializers";
import { String, Email } from "src/controller/serializers/models";
import { TypeMismatchError, SerializationError } from "src/controller";

jest.mock("../../../src/controller/errors", () => ({
	TypeMismatchError: jest.fn().mockReturnValue(Error("some-mismatch-error")),
	SerializationError: jest.fn().mockReturnValue(Error("some-serialization-error"))
}));

describe("BaseSerializer: ", () => {
	describe("serialization", () => {
		let mockInput: Record<any, any>;
		let MockSerializerInstance: typeof BaseSerializer;
		describe("when the derived serializer has no getters", () => {
			describe("when there are no errors", () => {
				beforeEach(() => {
					class MockSerializer extends BaseSerializer {
						static serialize = (obj: any) => super.serialize(this, obj);
						key1 = String;
						key2 = String;
					}
					MockSerializerInstance = MockSerializer;
				});
				describe("when the input is an array", () => {
					const output = [
						{ key1: "value11", key2: "value21" },
						{ key1: "value12", key2: "value22" }
					];
					beforeEach(() => {
						mockInput = [
							{
								key1: "value11",
								key2: "value21"
							},
							{
								key1: "value12",
								key2: "value22"
							}
						];
					});
					it("should return the serialized result", async () => {
						const result = await BaseSerializer.serialize(
							MockSerializerInstance,
							mockInput
						);
						expect(result).toEqual(output);
					});
				});
				describe("when the input is not an array", () => {
					const output = { key1: "value1", key2: "value2" };
					beforeEach(() => {
						mockInput = {
							key1: "value1",
							key2: "value2"
						};
					});
					it("should return the serialized result", async () => {
						const result = await BaseSerializer.serialize(
							MockSerializerInstance,
							mockInput
						);
						expect(result).toEqual(output);
					});
				});
			});

			describe("when there are errors", () => {
				describe("when some of the types are not matching", () => {
					beforeEach(() => {
						class MockSerializer extends BaseSerializer {
							static serialize = (obj: any) => super.serialize(this, obj);
							key1 = String;
							key2 = Email;
						}
						MockSerializerInstance = MockSerializer;
					});
					describe("when the input is an array", () => {
						beforeEach(() => {
							mockInput = [
								{
									key1: "value11",
									key2: "value12"
								},
								{
									key1: "value21",
									key2: "value@mail"
								}
							];
						});
						it("should throw the appropriate error", async () => {
							expect.assertions(4);
							let result: any;
							try {
								result = await BaseSerializer.serialize(
									MockSerializerInstance,
									mockInput
								);
							} catch (err: any) {
								expect(err.message).toBe("some-serialization-error");
							}
							expect(SerializationError).toHaveBeenCalledWith([
								Error("some-mismatch-error")
							]);
							expect(TypeMismatchError).toHaveBeenCalledWith("key2", Email, "value12");
							expect(result).toBeUndefined();
						});
					});
					describe("when the input is not an array", () => {
						beforeEach(() => {
							mockInput = {
								key1: "value1",
								key2: "value2"
							};
						});
						it("it should throw the appropriate error", async () => {
							expect.assertions(4);
							let result: any;
							try {
								result = await BaseSerializer.serialize(
									MockSerializerInstance,
									mockInput
								);
							} catch (err: any) {
								expect(err.message).toBe("some-serialization-error");
							}
							expect(SerializationError).toHaveBeenCalledWith([
								Error("some-mismatch-error")
							]);
							expect(TypeMismatchError).toHaveBeenCalledWith("key2", Email, "value2");
							expect(result).toBeUndefined();
						});
					});
				});
			});
		});
		describe("when the derived serializer has getters", () => {
			describe("when there are no errors", () => {
				beforeEach(() => {
					class MockSerializer extends BaseSerializer {
						static serialize = (obj: any) => super.serialize(this, obj);
						key1 = String;
						key2 = String;

						public get getParam() {
							return "some-param";
						}
					}
					MockSerializerInstance = MockSerializer;
				});
				describe("when the input is an array", () => {
					const output = [
						{ key1: "value11", key2: "value21", getParam: "some-param" },
						{ key1: "value12", key2: "value22", getParam: "some-param" }
					];
					beforeEach(() => {
						mockInput = [
							{
								key1: "value11",
								key2: "value21"
							},
							{
								key1: "value12",
								key2: "value22"
							}
						];
					});
					it("should return the serialized result", async () => {
						const result = await BaseSerializer.serialize(
							MockSerializerInstance,
							mockInput
						);
						expect(result).toEqual(output);
					});
				});
				describe("when the input is not an array", () => {
					const output = { key1: "value1", key2: "value2", getParam: "some-param" };
					beforeEach(() => {
						mockInput = {
							key1: "value1",
							key2: "value2"
						};
					});
					it("should return the serialized result", async () => {
						const result = await BaseSerializer.serialize(
							MockSerializerInstance,
							mockInput
						);
						expect(result).toEqual(output);
					});
				});
			});
			describe("when there are errors", () => {
				let mockGetter: jest.Mock;
				describe("when serializer value cannot be assigned ", () => {
					const error = { message: "some-error-message" };
					beforeEach(() => {
						mockGetter = jest.fn().mockRejectedValue(error);
						class MockSerializer extends BaseSerializer {
							static serialize = (obj: any) => super.serialize(this, obj);
							key1 = String;
							key2 = String;

							public get emailFirst() {
								return mockGetter();
							}
						}
						MockSerializerInstance = MockSerializer;
					});
					describe("when the input is an array", () => {
						beforeEach(() => {
							mockInput = [
								{
									key1: "value11",
									key2: "value21"
								},
								{
									key1: "value12",
									key2: "value22"
								}
							];
						});
						it("should throw the approptiate error", async () => {
							expect.assertions(3);
							let result: any;
							try {
								result = await BaseSerializer.serialize(
									MockSerializerInstance,
									mockInput
								);
							} catch (err: any) {
								expect(err.message).toBe("some-serialization-error");
							}
							expect(SerializationError).toHaveBeenCalledWith([error]);
							expect(result).toBeUndefined();
						});
					});
					describe("when the input is not an array", () => {
						beforeEach(() => {
							mockInput = {
								key1: "value1",
								key2: "value2"
							};
						});
						it("should throw the appropriate error", async () => {
							expect.assertions(3);
							let result: any;
							try {
								result = await BaseSerializer.serialize(
									MockSerializerInstance,
									mockInput
								);
							} catch (err: any) {
								expect(err.message).toBe("some-serialization-error");
							}
							expect(SerializationError).toHaveBeenCalledWith([error]);
							expect(result).toBeUndefined();
						});
					});
				});

				describe("when some of the types are not matching", () => {
					beforeEach(() => {
						class MockSerializer extends BaseSerializer {
							static serialize = (obj: any) => super.serialize(this, obj);
							key1 = String;
							key2 = Email;

							public get getParam() {
								return "some-param";
							}
						}
						MockSerializerInstance = MockSerializer;
					});
					describe("when the input is an array", () => {
						beforeEach(() => {
							mockInput = [
								{
									key1: "value11",
									key2: "value21"
								},
								{
									key1: "value12",
									key2: "value@mail"
								}
							];
						});
						it("should throw the appropriate error", async () => {
							expect.assertions(4);
							let result: any;
							try {
								result = await BaseSerializer.serialize(
									MockSerializerInstance,
									mockInput
								);
							} catch (err: any) {
								expect(err.message).toBe("some-serialization-error");
							}
							expect(SerializationError).toHaveBeenCalledWith([
								Error("some-mismatch-error")
							]);
							expect(TypeMismatchError).toHaveBeenCalledWith("key2", Email, "value21");
							expect(result).toBeUndefined();
						});
					});
					describe("when the input is not an array", () => {
						beforeEach(() => {
							mockInput = {
								key1: "value1",
								key2: "value2"
							};
						});
						it("it should throw the appropriate error", async () => {
							expect.assertions(4);
							let result: any;
							try {
								result = await BaseSerializer.serialize(
									MockSerializerInstance,
									mockInput
								);
							} catch (err: any) {
								expect(err.message).toBe("some-serialization-error");
							}
							expect(SerializationError).toHaveBeenCalledWith([
								Error("some-mismatch-error")
							]);
							expect(TypeMismatchError).toHaveBeenCalledWith("key2", Email, "value2");
							expect(result).toBeUndefined();
						});
					});
				});
			});
		});
	});
});
