import "server-only";
import { promises as dns } from "node:dns";

/** Subdomain a challenge token is published under, so this never collides
 * with a domain's own apex TXT records (SPF, DKIM, site verification, etc.). */
export const DOMAIN_CHALLENGE_SUBDOMAIN = "_mixotron-challenge";

/**
 * Normalizes user input ("example.com", "https://example.com/", "Example.com")
 * down to a bare lowercase hostname suitable for a DNS lookup.
 */
export function normalizeDomain(input: string): string {
	const withoutScheme = input
		.trim()
		.toLowerCase()
		.replace(/^[a-z]+:\/\//, "");
	const hostname = withoutScheme.split(/[/?#]/)[0]?.split(":")[0] ?? "";
	if (!hostname || !hostname.includes(".")) {
		throw new Error(`"${input}" doesn't look like a domain.`);
	}
	return hostname;
}

export interface DomainChallengeCheck {
	verified: boolean;
	reason?: string;
}

/**
 * Looks up `_mixotron-challenge.<domain>` and checks whether any TXT record
 * matches the expected token exactly. A single TXT record can be split by
 * the DNS server into multiple quoted strings; Node's resolveTxt already
 * joins each record's own strings into one array entry, so plain equality
 * against the full joined value is correct — no need to handle chunking here.
 */
export async function checkDomainChallenge(
	domain: string,
	token: string,
): Promise<DomainChallengeCheck> {
	const name = `${DOMAIN_CHALLENGE_SUBDOMAIN}.${domain}`;
	let records: string[][];
	try {
		records = await dns.resolveTxt(name);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOTFOUND" || code === "ENODATA") {
			return { verified: false, reason: `No TXT record found at ${name}.` };
		}
		throw error;
	}

	const values = records.map((chunks) => chunks.join(""));
	if (values.includes(token)) {
		return { verified: true };
	}
	return {
		verified: false,
		reason: `Found a TXT record at ${name}, but it didn't match the expected value.`,
	};
}
