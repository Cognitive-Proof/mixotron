"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "~/server/better-auth/client";

const NAV_LINKS = [
	{ href: "/dashboard", label: "Overview" },
	{ href: "/dashboard/profile", label: "Profiles" },
	{ href: "/dashboard/author", label: "Author" },
	{ href: "/dashboard/verify", label: "Verify" },
	{ href: "/dashboard/link", label: "Link" },
	{ href: "/dashboard/sign", label: "Sign" },
];

export function DashboardShell({
	children,
	userName,
	userEmail,
}: {
	children: React.ReactNode;
	userName: string;
	userEmail: string;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const label = userName || userEmail;

	return (
		<div className="dash-shell">
			<aside className="dash-sidebar">
				<Link className="wordmark" href="/">
					<span className="dot" />
					MIX-O-TRON
				</Link>

				<nav className="dash-nav">
					{NAV_LINKS.map((link) => {
						const active =
							link.href === "/dashboard"
								? pathname === "/dashboard"
								: pathname.startsWith(link.href);
						return (
							<Link
								className={active ? "active" : ""}
								href={link.href}
								key={link.href}
							>
								{link.label}
							</Link>
						);
					})}
				</nav>

				<div className="dash-user">
					<div className="auth-user">
						<span aria-hidden="true" className="auth-avatar">
							{label.charAt(0).toUpperCase()}
						</span>
						<span className="auth-name">{label}</span>
					</div>
					<button
						className="btn btn-ghost btn-sm btn-block"
						onClick={async () => {
							await authClient.signOut();
							router.push("/");
						}}
						type="button"
					>
						Sign out
					</button>
				</div>
			</aside>

			<main className="dash-main">{children}</main>
		</div>
	);
}
