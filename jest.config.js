module.exports = {
	testEnvironment: "jsdom",
	transform: {
		"^.+\\.(ts|tsx)$": "ts-jest",
		"^.+\\.(js|jsx)$": "babel-jest"
	},
	moduleNameMapper: {
		"\\.(css|less|scss|sass)$": "identity-obj-proxy",
		"\\.(png|jpg|jpeg|gif|svg|webp)$": "<rootDir>/jest.fileMock.js",

		"^@utils/(.*)$": "<rootDir>/src/utils/$1",
		"^@common/(.*)$": "<rootDir>/src/common/$1",
		"^@component/(.*)$": "<rootDir>/src/components/$1",
		"^@constants/(.*)$": "<rootDir>/src/constants/$1",
		"^@store/(.*)$": "<rootDir>/src/store/$1",
		"^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
		"^@type/(.*)$": "<rootDir>/src/types/$1",
		"^@types/(.*)$": "<rootDir>/src/types/$1",
		"^@assets/(.*)$": "<rootDir>/src/assets/$1",
		"^@engine/(.*)$": "<rootDir>/src/engine/$1"
	},
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
	collectCoverage: true,
	collectCoverageFrom: [
		"src/**/*.{ts,tsx,js,jsx}",
		"!**/node_modules/**",
		"!**/vendor/**",
		"!src/utils/api/**",
		"!src/common/**"
	],
	transformIgnorePatterns: [],
	coverageDirectory: "coverage"
};
