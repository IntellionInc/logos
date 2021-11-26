export default {
	moduleNameMapper: {
		"^src/(.*)$": "<rootDir>/src/$1"
	},
	roots: ["<rootDir>/test"],
	setupFiles: ["<rootDir>/test/setup.ts"],
	testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
	transform: {
		"^.+\\.(ts|tsx)$": "ts-jest"
	}
};
