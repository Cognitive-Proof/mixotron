"use client";

/**
 * Minimal client-side wrapper around the EIP-1193 provider MetaMask (and
 * every other EVM wallet extension) injects as `window.ethereum` — no
 * wallet-connector library needed for a single-provider "connect and sign
 * one message" flow. Verification of the resulting signature happens
 * server-side (see src/server/trust/verify-wallet.ts); this file only ever
 * touches the wallet, never any key material.
 */

interface Eip1193Provider {
	request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
	interface Window {
		ethereum?: Eip1193Provider;
	}
}

export class WalletNotAvailableError extends Error {
	constructor() {
		super("No EVM wallet extension (e.g. MetaMask) was found in this browser.");
		this.name = "WalletNotAvailableError";
	}
}

export function isWalletAvailable(): boolean {
	return typeof window !== "undefined" && Boolean(window.ethereum);
}

/** Prompts the wallet's own "connect" UI and returns the first authorized
 * address, checksum-cased as the wallet returns it. */
export async function connectWallet(): Promise<string> {
	if (!isWalletAvailable()) {
		throw new WalletNotAvailableError();
	}
	const accounts = (await window.ethereum?.request({
		method: "eth_requestAccounts",
	})) as string[];
	const address = accounts[0];
	if (!address) {
		throw new Error("No account was authorized.");
	}
	return address;
}

/** Prompts the wallet to sign `challenge` (plain text, shown to the user
 * as-is — not a hash) with `address` via personal_sign. Chain-agnostic: an
 * EOA's personal_sign signature is identical on every EVM network, so this
 * doesn't need to know or care which chain the wallet is currently on. */
export async function signChallenge(
	address: string,
	challenge: string,
): Promise<string> {
	if (!isWalletAvailable()) {
		throw new WalletNotAvailableError();
	}
	const signature = (await window.ethereum?.request({
		method: "personal_sign",
		params: [challenge, address],
	})) as string;
	if (!signature) {
		throw new Error("Wallet signing was cancelled or failed.");
	}
	return signature;
}
