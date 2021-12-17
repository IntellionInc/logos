import { TypeMismatchError, SerializationError } from "../errors";
import { IntellionType } from "./models";

export class BaseSerializer {
	static #findGetters = (klass: any) =>
		Object.getOwnPropertyNames(klass.prototype)
			.map(key => [key, Object.getOwnPropertyDescriptor(klass.prototype, key)])
			.filter(
				([key, descriptor]) =>
					descriptor &&
					descriptor.hasOwnProperty("get") &&
					typeof (descriptor as PropertyDescriptor).get === "function"
			)
			.map(([key]) => key as string)
			.filter(item => !!item);

	static #createSerializedObject = async (
		klass: typeof BaseSerializer,
		obj: Record<any, any> | Record<any, any>[]
	) => {
		const getters: string[] = BaseSerializer.#findGetters(klass);

		const serializer = new klass();

		const result: Record<string, any> = {};
		const errors = (
			await Promise.all(
				[...Object.keys(serializer), ...getters].map(async key => {
					let value: any;
					try {
						value = await serializer[key];
					} catch (error) {
						return error;
					}
					if (getters.includes(key)) result[key] = value;
					else if ((value as typeof IntellionType).hasSameTypeAs(obj[key])) {
						serializer[key] = result[key] = obj[key];
					} else {
						return new TypeMismatchError(key, value, obj[key]);
					}
				})
			)
		).filter(itm => !!itm);
		if (errors.length) throw new SerializationError(errors);

		return result;
	};
	static serialize = async (
		klass: typeof BaseSerializer,
		data: Record<any, any> | Record<any, any>[]
	) => {
		if (Array.isArray(data))
			return await Promise.all(
				data.map(async obj => await BaseSerializer.#createSerializedObject(klass, obj))
			);
		return await BaseSerializer.#createSerializedObject(klass, data);
	};
}
