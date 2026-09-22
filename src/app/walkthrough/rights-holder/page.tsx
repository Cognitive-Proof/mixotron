import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";
import { CLAIM_ORDER, CLAIMS } from "~/app/walkthrough/_lib/claims";

export const metadata: Metadata = {
	title: "Rights Holder Walkthrough — Mix-O-Tron",
	description:
		"For rights holders: figure out what to do next based on how much C2PA information the audio track you want to publish already contains.",
};

export default function RightsHolderWalkthroughPage() {
	return (
		<>
			<SiteNav showLinks={false} />
			<main>
				<div className="doc-hero">
					<div className="wrap">
						<Link className="doc-back" href="/walkthrough">
							← Walkthrough
						</Link>
						<div className="eyebrow">Rights Holder</div>
						<h1>
							What C2PA information does the audio track you want to publish
							contain?
						</h1>
						<p className="doc-dek">
							Choose the option that best describes the track. We&apos;ll use it
							to point you toward the right next step.
						</p>
					</div>
				</div>

				<div className="wrap">
					<div className="choice-list">
						{CLAIM_ORDER.map((claimId) => {
							const claim = CLAIMS[claimId];
							return (
								<Link
									className="choice-card"
									href={`/walkthrough/rights-holder/verifyTrack#${claim.verifyState}`}
									key={claim.id}
								>
									<span className="choice-card-marker" />
									<span className="choice-card-label">{claim.choiceLabel}</span>
									<span className="choice-card-cta">→</span>
								</Link>
							);
						})}
					</div>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}
