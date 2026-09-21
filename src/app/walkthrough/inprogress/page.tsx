import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";

export const metadata: Metadata = {
	title: "Walkthrough — Coming Soon — Mix-O-Tron",
	description: "This section of the Mix-O-Tron walkthrough is coming soon.",
};

export default function WalkthroughInProgressPage() {
	return (
		<>
			<SiteNav showLinks={false} />
			<main>
				<div className="doc-hero">
					<div className="wrap">
						<Link className="doc-back" href="/walkthrough">
							← Walkthrough
						</Link>
						<div className="eyebrow">Coming Soon</div>
						<h1>This Section Is Still Being Written</h1>
						<p className="doc-dek">
							We&apos;re still putting together the walkthrough for this role.
							Check back soon, or head to the full guidance doc in the meantime.
						</p>
						<p className="doc-dek">
							<Link href="/info">Read the full guidance →</Link>
						</p>
					</div>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}
