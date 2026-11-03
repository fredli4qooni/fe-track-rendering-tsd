import { defineConfig } from "@rspack/cli";
import { DefinePlugin, rspack } from "@rspack/core";
import RefreshPlugin from "@rspack/plugin-react-refresh";
import { configDotenv } from "dotenv";
import * as path from "node:path";

import { dependencies as deps } from "./package.json";

const isDev = process.env.NODE_ENV === "development";
const reactRefreshWorkerExclude = /hooks[\\/]+worker[\\/].+\.worker\.ts$/i;

// Load .env into process.env
configDotenv();

const SERVICE_NAME = process.env.SERVICE_NAME ?? "UNKNOWN_SERVICE";

// Generic helper for reading env variables
const getEnv = (key: string, fallback?: string): string =>
	process.env[key] ?? fallback ?? "";

// Map env to DefinePlugin variables
const defineEnv = Object.entries(process.env).reduce<Record<string, string>>(
	(acc, [key, val]) => {
		acc[`process.env.${key}`] = JSON.stringify(val);
		return acc;
	},
	{}
);

const targets = ["chrome >= 87", "edge >= 88", "firefox >= 78", "safari >= 14"];

export default defineConfig({
	context: __dirname,
	entry: {
		main: "./src/main.tsx"
	},
	devtool: "source-map",
	output: {
		publicPath: "auto",
		filename: "bundle.js"
	},
	resolve: {
		modules: [path.join(__dirname, "src"), "node_modules"],
		alias: {
			"@common": path.resolve(__dirname, "src/common"),
			"@component": path.resolve(__dirname, "src/components"),
			"@constants": path.resolve(__dirname, "src/constants"),
			"@utils": path.resolve(__dirname, "src/utils"),
			"@store": path.resolve(__dirname, "src/store"),
			"@hooks": path.resolve(__dirname, "src/hooks"),
			"@type": path.resolve(__dirname, "src/types"),
			"@engine": path.resolve(__dirname, "src/engine"),
			"@assets": path.resolve(__dirname, "src/assets")
		},
		extensions: ["...", ".ts", ".tsx", ".jsx"]
	},
	devServer: {
		port: Number.parseInt(getEnv("PORT", "8713"), 10),
		static: {
			directory: path.join(__dirname, "public")
		},
		historyApiFallback: true,
		client: {
			overlay: false
		}
	},
	module: {
		rules: [
			{
				test: /\.(vert|frag|glsl)$/,
				type: "asset/source"
			},
			{
				test: /\.css$/,
				use: ["postcss-loader"],
				type: "css"
			},
			{
				test: /\.svg$/,
				type: "asset"
			},
			{
				test: /\.png$/,
				type: "asset"
			},
			{
				test: /\.[jt]sx?$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "builtin:swc-loader",
						options: {
							jsc: {
								parser: {
									syntax: "typescript",
									tsx: true
								},
								transform: {
									react: {
										runtime: "automatic",
										development: isDev,
										refresh: isDev
									}
								}
							},
							env: { targets }
						}
					}
				]
			}
		]
	},
	plugins: [
		new rspack.container.ModuleFederationPlugin({
			name: SERVICE_NAME.toLowerCase(),
			filename: "remoteEntry.js",
			remotes: {},
			exposes: {},
			shared: {
				...deps,
				maptalks: {
					singleton: true,
					requiredVersion: false,
					eager: true
				},
				"gl-matrix": {
					singleton: true,
					eager: true // WAJIB untuk loadShareSync
				},
				react: {
					singleton: true,
					eager: true,
					requiredVersion: deps.react
				},
				"react-dom": {
					singleton: true,
					eager: true,
					requiredVersion: deps["react-dom"]
				},
				clsx: {
					singleton: true,
					eager: true,
					requiredVersion: deps["clsx"]
				},
				"tailwind-merge": {
					singleton: true,
					eager: true,
					requiredVersion: deps["tailwind-merge"]
				},
				"google-protobuf": {
					singleton: true,
					eager: true,
					requiredVersion: deps["google-protobuf"]
				},
				"grpc-web": {
					singleton: true,
					eager: true,
					requiredVersion: deps["grpc-web"]
				},
				zustand: {
					singleton: true,
					eager: true,
					requiredVersion: deps["zustand"]
				}
			}
		}),
		new rspack.HtmlRspackPlugin({
			template: "./index.html"
		}),
		new DefinePlugin(defineEnv),
		isDev
			? new RefreshPlugin({
					exclude: reactRefreshWorkerExclude
				})
			: null
	].filter(Boolean),
	optimization: {
		minimizer: [
			new rspack.SwcJsMinimizerRspackPlugin(),
			new rspack.LightningCssMinimizerRspackPlugin({
				minimizerOptions: { targets }
			})
		]
	},
	experiments: {
		css: true
	}
});
