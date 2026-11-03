import "@testing-library/jest-dom";

jest.mock("@utils/cn", () => ({
	cn: (...args: string[]) => args.join(" ")
}));
