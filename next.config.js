/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	// This package loads its WASM binary via fs.readFileSync(__dirname + ...)
	// at runtime — bundling it would break that path resolution.
	serverExternalPackages: ["c2pa-rs-javascript-library"],
	// Produces a self-contained .next/standalone build (server + traced
	// node_modules) for the Docker image, instead of relying on a full
	// `npm install` in the runtime container.
	output: "standalone",
};

export default config;
