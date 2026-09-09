import "server-only";
import { randomBytes } from "node:crypto";
import { getAddress, isAddress, verifyMessage } from "viem";

/**
 * Builds the exact, human-readable text a wallet must sign to prove control
 * of `address` for this profile. Deliberately plain text (not raw hex/hash)
 * so MetaMask's `personal_sign` prompt shows the user something legible
 * rather than an opaque blob — and a random nonce so an old signature can't
 * be replayed against a later challenge.
 */
export function buildWalletChallenge(
	profileId: string,
	address: string,
): string {
	const nonce = randomBytes(16).toString("hex");
	return [
		"Mix-O-Tron wallet verification",
		`Profile: ${profileId}`,
		`Address: ${address}`,
		`Nonce: ${nonce}`,
		`Issued: ${new Date().toISOString()}`,
	].join("\n");
}

/** Normalizes to EIP-55 checksummed form; throws if not a well-formed
 * 20-byte hex address. */
export function normalizeAddress(address: string): string {
	if (!isAddress(address)) {
		throw new Error(`"${address}" isn't a valid EVM address.`);
	}
	return getAddress(address);
}

/**
 * Confirms `signature` over `challenge` was produced by `address`'s private
 * key — plain EIP-191 `personal_sign` recovery (viem's `verifyMessage`
 * utility form, not the publicClient method, so this needs no RPC/chain
 * config: address recovery from a personal_sign signature is identical on
 * every EVM chain, there's nothing chain-specific to query). Only supports
 * externally-owned accounts (a normal MetaMask wallet), not smart-contract
 * wallets (ERC-1271) — fine for this app's purposes today.
 */
export async function verifyWalletChallenge(
	address: string,
	challenge: string,
	signature: string,
): Promise<boolean> {
	return verifyMessage({
		address: address as `0x${string}`,
		message: challenge,
		signature: signature as `0x${string}`,
	});
}
