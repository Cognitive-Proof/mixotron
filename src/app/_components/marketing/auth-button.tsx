"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "~/server/better-auth/client";

type Mode = "sign-in" | "sign-up";

export function AuthButton() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<Mode>("sign-in");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;

		function onPointerDown(event: PointerEvent) {
			if (!panelRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setOpen(false);
		}

		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	function resetForm() {
		setName("");
		setEmail("");
		setPassword("");
		setError(null);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		const { error: authError } =
			mode === "sign-in"
				? await authClient.signIn.email({ email, password })
				: await authClient.signUp.email({ email, password, name });

		setSubmitting(false);

		if (authError) {
			setError(authError.message ?? "Something went wrong. Try again.");
			return;
		}

		setOpen(false);
		resetForm();
	}

	if (isPending) {
		return <div className="auth" />;
	}

	if (session) {
		const label = session.user.name || session.user.email;
		return (
			<div className="auth-user">
				<span aria-hidden="true" className="auth-avatar">
					{label.charAt(0).toUpperCase()}
				</span>
				<span className="auth-name">{label}</span>
				<Link className="btn btn-ghost auth-signout" href="/dashboard">
					Dashboard
				</Link>
				<button
					className="btn btn-ghost auth-signout"
					onClick={async () => {
						await authClient.signOut();
						router.refresh();
					}}
					type="button"
				>
					Sign out
				</button>
			</div>
		);
	}

	return (
		<div className="auth" ref={panelRef}>
			<button
				aria-expanded={open}
				className="btn btn-primary auth-trigger"
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				Log in
			</button>

			{open && (
				<div className="auth-panel">
					<div className="auth-tabs" role="tablist">
						<button
							aria-selected={mode === "sign-in"}
							className={`auth-tab ${mode === "sign-in" ? "active" : ""}`}
							onClick={() => {
								setMode("sign-in");
								setError(null);
							}}
							role="tab"
							type="button"
						>
							Sign in
						</button>
						<button
							aria-selected={mode === "sign-up"}
							className={`auth-tab ${mode === "sign-up" ? "active" : ""}`}
							onClick={() => {
								setMode("sign-up");
								setError(null);
							}}
							role="tab"
							type="button"
						>
							Create account
						</button>
					</div>

					<form onSubmit={handleSubmit}>
						{mode === "sign-up" && (
							<div className="field">
								<label htmlFor="auth-name">Name</label>
								<input
									autoComplete="name"
									id="auth-name"
									onChange={(e) => setName(e.target.value)}
									required
									type="text"
									value={name}
								/>
							</div>
						)}
						<div className="field">
							<label htmlFor="auth-email">Email</label>
							<input
								autoComplete="email"
								id="auth-email"
								onChange={(e) => setEmail(e.target.value)}
								required
								type="email"
								value={email}
							/>
						</div>
						<div className="field">
							<label htmlFor="auth-password">Password</label>
							<input
								autoComplete={
									mode === "sign-in" ? "current-password" : "new-password"
								}
								id="auth-password"
								minLength={8}
								onChange={(e) => setPassword(e.target.value)}
								required
								type="password"
								value={password}
							/>
						</div>

						{error && <p className="form-error">{error}</p>}

						<button
							className="btn btn-primary auth-submit"
							disabled={submitting}
							type="submit"
						>
							{submitting
								? "Please wait…"
								: mode === "sign-in"
									? "Sign in"
									: "Create account"}
						</button>
					</form>
				</div>
			)}
		</div>
	);
}
