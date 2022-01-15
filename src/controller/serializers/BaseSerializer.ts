import { IntellionType } from "..";
import { ISerializerInput, ISerializerOutput, SerializerFieldStatus } from "../../types";
import { TypeMismatchError, SerializationError } from "../errors";

export class BaseSerializer {
	static findGetters = (Schema: typeof BaseSerializer) =>
		Object.getOwnPropertyNames(Schema.prototype)
			.map(key => [key, Object.getOwnPropertyDescriptor(Schema.prototype, key)])
			.filter(
				([key, descriptor]) =>
					descriptor &&
					descriptor.hasOwnProperty("get") &&
					typeof (<PropertyDescriptor>descriptor).get === "function"
			)
			.map(([key]) => <string>key)
			.filter(item => !!item);

	static setOutput = async (
		Schema: typeof BaseSerializer,
		inputField: ISerializerInput
	) => {
		const getters: string[] = BaseSerializer.findGetters(Schema);

		const serializer = new Schema();
		return await new Result(getters, serializer, inputField).calculate();
	};

	static serialize = async (
		Schema: typeof BaseSerializer,
		input: ISerializerInput | ISerializerInput[]
	) =>
		Array.isArray(input)
			? await Promise.all(
					input.map(async field => await BaseSerializer.setOutput(Schema, field))
			  )
			: await BaseSerializer.setOutput(Schema, input);
}

class Result {
	errors: any[] = [];
	shemaKeys: any[];
	outputCandidate: ISerializerOutput = {};

	constructor(
		public getters: string[],
		public serializer: BaseSerializer,
		public inputField: ISerializerInput | ISerializerInput[]
	) {
		this.shemaKeys = [...Object.keys(serializer), ...getters];
	}

	getRequiredType = async (schemaKey: string) => {
		try {
			return await this.serializer[schemaKey];
		} catch (error) {
			this.errors.push(error);
		}
	};

	validate = async (schemaKey: string) => {
		const schemaValue = await this.getRequiredType(schemaKey);

		const inputValue = this.inputField[schemaKey];
		return new TypeMatcher(
			schemaKey,
			schemaValue,
			inputValue,
			this.getters,
			this.outputCandidate
		).match();
	};

	_findErrors = async () => {
		this.errors = (await Promise.all(this.shemaKeys.map(await this.validate))).filter(
			e => !!e
		);
	};

	calculate = async () => {
		await this._findErrors();
		if (this.errors.length) throw new SerializationError(this.errors);
		return this.outputCandidate;
	};
}

class TypeMatcher {
	typeVariants = {
		getter: this.schemaValue,
		allowed: this.inputValue,
		optional: null
	};

	constructor(
		public schemaKey: string,
		public schemaValue: any,
		public inputValue: any,
		public getters: string[],
		public outputValue: ISerializerOutput | ISerializerOutput[]
	) {}

	isGetter = (): SerializerFieldStatus | undefined =>
		this.getters.includes(this.schemaKey) ? "getter" : undefined;

	isAllowed = (): SerializerFieldStatus | undefined =>
		this.schemaValue.hasSameTypeAs(this.inputValue) ? "allowed" : undefined;

	isAllowedFlex = (): SerializerFieldStatus | undefined =>
		this.schemaValue.some(i => i && i.hasSameTypeAs(this.inputValue))
			? "allowed"
			: undefined;

	isNullable = (): SerializerFieldStatus | undefined =>
		!this.inputValue && this.schemaValue.some(i => i == undefined)
			? "optional"
			: undefined;

	isFlexible = () => {
		const { schemaKey, schemaValue } = this;
		return !this.getters.includes(schemaKey) && Array.isArray(schemaValue);
	};

	getMatch = () => {
		const { schemaKey, schemaValue, inputValue } = this;
		const { isGetter, isAllowed } = this;

		const status = isGetter() || isAllowed();
		this.outputValue[schemaKey] = this.typeVariants[status];

		if (this.outputValue[schemaKey] === undefined)
			return new TypeMismatchError(
				schemaKey,
				this.#formulateErrorMessageDefinition(schemaValue),
				inputValue
			);
	};

	getMatchFlex = () => {
		const { schemaKey, schemaValue, inputValue } = this;
		const { isGetter, isAllowedFlex, isNullable } = this;

		const status = isGetter() || isAllowedFlex() || isNullable();
		this.outputValue[schemaKey] = this.typeVariants[status];

		if (this.outputValue[schemaKey] === undefined)
			return new TypeMismatchError(
				schemaKey,
				this.#formulateErrorMessageDefinition(schemaValue),
				inputValue
			);
	};

	match = () => (this.isFlexible() ? this.getMatchFlex() : this.getMatch());

	#formulateErrorMessageDefinition = (
		schemaValue: typeof IntellionType | typeof IntellionType[]
	): string => {
		const getDefinitionOrUndefinedMessage = (
			item: { definition: string } | undefined
		): string => (item ? item.definition : "not defined");

		if (!Array.isArray(schemaValue)) return getDefinitionOrUndefinedMessage(schemaValue);
		return schemaValue.map(getDefinitionOrUndefinedMessage).join(", ");
	};
}
