import Link from "next/link";
import { AuthButton } from "~/app/_components/marketing/auth-button";

const LINKS = [
	{ href: "/info", label: "Guidance" },
	{ href: "#features", label: "Features" },
	{ href: "#how-it-works", label: "How It Works" },
	{ href: "#licensing", label: "Licensing" },
	{ href: "#provenance", label: "Provenance" },
	{ href: "#profiles", label: "Profiles" },
	{ href: "#trust", label: "Trust" },
	{ href: "#open-source", label: "Open Source" },
	{ href: "#architecture", label: "Architecture" },
];

export function SiteNav({ showLinks = true }: { showLinks?: boolean }) {
	return (
		<header className="site-nav">
			<div className="wrap">
				<Link className="wordmark" href={showLinks ? "#top" : "/"}>
					<span className="dot" />
					MIX-O-TRON
				</Link>
				<div className="nav-right">
					{showLinks && (
						<nav className="nav-links">
							{LINKS.map((link) => (
								<a href={link.href} key={link.href}>
									{link.label}
								</a>
							))}
						</nav>
					)}
					<AuthButton />
				</div>
			</div>
		</header>
	);
}
