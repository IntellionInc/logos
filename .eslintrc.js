module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "tsconfig.json",
		sourceType: "module"
	},
	plugins: [
		"@typescript-eslint/eslint-plugin",
		"prettier",
		"eslint-comments",
		"prefer-arrow"
	],
	extends: [
		"plugin:@typescript-eslint/recommended",
		"plugin:prettier/recommended",
		"plugin:prettier/recommended",
		"prettier",
		"plugin:eslint-comments/recommended"
	],
	root: true,
	env: {
		node: true,
		jest: true,
		es6: true
	},
	ignorePatterns: [".eslintrc.js", "jest.config.ts"],
	rules: {
		"prettier/prettier": "error",
		"eslint-comments/no-unused-disable": "error",
		"@typescript-eslint/interface-name-prefix": "off",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-explicit-any": "off",		

		"prefer-arrow/prefer-arrow-functions": [
			"warn",
			{
				disallowPrototype: true,
				singleReturnOnly: false,
				classPropertiesAllowed: false
			}
		],
		quotes: ["error", "double"],
		"no-console": "off",
		"arrow-parens": ["error", "as-needed"],
	}
};
