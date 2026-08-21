import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		BETTER_AUTH_SECRET:
			process.env.NODE_ENV === "production"
				? z.string()
				: z.string().optional(),
		BETTER_AUTH_GITHUB_CLIENT_ID: z.string(),
		BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string(),
		// The public URL better-auth is served at — used for its baseURL and
		// trustedOrigins. Required in production because Cloud Run sits behind
		// the Cloudflare Worker proxy, so the request Host better-auth would
		// otherwise infer is the internal *.run.app hostname, not the public
		// domain the browser's Origin header actually sends.
		BETTER_AUTH_URL:
			process.env.NODE_ENV === "production"
				? z.string()
				: z.string().optional(),
		MIX_O_TRON_MONGODB_URI: z.string(),
		// The external Sign-O-Tron signing API. Not deployed yet — when unset,
		// signing falls back to c2pa-rs-javascript-library with local test certs.
		SIGN_O_TRON_URL: z.string().optional(),
		SIGN_O_TRON_API_KEY: z.string().optional(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		BETTER_AUTH_GITHUB_CLIENT_ID: process.env.BETTER_AUTH_GITHUB_CLIENT_ID,
		BETTER_AUTH_GITHUB_CLIENT_SECRET:
			process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		MIX_O_TRON_MONGODB_URI: process.env.MIX_O_TRON_MONGODB_URI,
		SIGN_O_TRON_URL: process.env.SIGN_O_TRON_URL,
		SIGN_O_TRON_API_KEY: process.env.SIGN_O_TRON_API_KEY,
		NODE_ENV: process.env.NODE_ENV,
		// NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
