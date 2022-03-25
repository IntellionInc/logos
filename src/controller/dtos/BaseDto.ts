import { IntellionType } from "../models";
import { TypeMismatchError } from "../errors";
import { IDtoInput } from "../../types";

export class BaseDto {
	static validate = (Schema: typeof BaseDto, input: IDtoInput) => {
		const dto = new Schema();
		return new TypeMatcher(input, dto).match();
	};
}

export class TypeMatcher {
	schemaKeys: string[];
	expected: typeof IntellionType | typeof IntellionType[];
	received: any;
	constructor(public input: IDtoInput | IDtoInput[], public dto: BaseDto) {
		this.schemaKeys = [...Object.keys(dto)];
	}

	isAllowed = () => (<typeof IntellionType>this.expected).hasSameTypeAs(this.received);

	isAllowedFlex = () =>
		(<typeof IntellionType[]>this.expected).some(
			i => i && i.hasSameTypeAs(this.received)
		);

	isNullable = () => {
		return (
			!this.received && (<typeof IntellionType[]>this.expected).some(i => i == undefined)
		);
	};

	isFlexible = () => Array.isArray(this.expected);

	getMatch = () => this.isAllowed();

	getMatchFlex = () => this.isAllowedFlex() || this.isNullable();

	match = () => {
		let status = true;
		this.schemaKeys.forEach(key => {
			[this.expected, this.received] = [this.dto[key], this.input[key]];
			status = this.isFlexible() ? this.getMatchFlex() : this.getMatch();

			if (!status)
				throw new TypeMismatchError(
					key,
					this.#formulateErrorMessageDefinition(),
					this.received
				);
		});
		return status;
	};

	#formulateErrorMessageDefinition = (): string => {
		const getDefinitionOrUndefinedMessage = (
			item: { definition: string } | undefined
		): string => (item ? item.definition : "not defined");

		if (!Array.isArray(this.expected))
			return getDefinitionOrUndefinedMessage(this.expected);
		return this.expected.map(getDefinitionOrUndefinedMessage).join(", ");
	};
}
