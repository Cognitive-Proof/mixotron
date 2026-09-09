import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "~/app/_components/marketing/site-footer";
import { SiteNav } from "~/app/_components/marketing/site-nav";
import { ManifestPreview } from "~/app/info/_components/manifest-preview";
import { MidiArranger } from "~/app/info/midi/_components/midi-arranger";

export const metadata: Metadata = {
	title: "MIDI Arranger — Mix-O-Tron",
	description:
		"Arrange a simple pattern in the browser with Tone.js, hear it back, then export a real .mid file with a C2PA manifest embedded directly in it.",
};

function CodeBlock({ children }: { children: string }) {
	return (
		<div className="doc-code">
			<div className="doc-code-label">JSON</div>
			<pre>
				<code>{children}</code>
			</pre>
		</div>
	);
}

export default function MidiInfoPage() {
	return (
		<>
			<SiteNav showLinks={false} />
			<main>
				<div className="doc-hero">
					<div className="wrap">
						<Link className="doc-back" href="/info">
							← Music Guidance
						</Link>
						<div className="eyebrow">Guidance · Interactive Tool</div>
						<h1>Arranging a MIDI Pattern and Signing the Export</h1>
						<p className="doc-dek">
							A minimal in-browser step sequencer, built on Tone.js, for trying
							out how a MIDI file created entirely in JavaScript can leave with
							a C2PA manifest embedded directly in the exported .mid.
						</p>
						<div className="doc-meta">
							<span>Draft · v0.1</span>
							<span>No account required to arrange or preview</span>
						</div>
					</div>
				</div>

				<div className="wrap">
					<div className="doc-layout">
						<nav aria-label="Table of contents" className="doc-toc">
							<div className="doc-toc-title">On this page</div>
							<ol>
								<li>
									<ol>
										<li className="doc-toc-l1">
											<a href="#arranger">1. Arrange &amp; Preview</a>
										</li>
										<li className="doc-toc-l1">
											<a href="#signing">2. Exporting a Content Credential</a>
										</li>
									</ol>
								</li>
							</ol>
						</nav>

						<article className="doc-content">
							<div className="doc-section" id="arranger">
								<h2>
									<span className="doc-num">1</span>
									Arrange &amp; Preview
								</h2>
								<p className="doc-lead">
									Click cells to place notes on a 16th-note grid, then press
									Play. Arranging and previewing runs entirely client-side with{" "}
									<a
										href="https://tonejs.github.io/"
										rel="noreferrer"
										target="_blank"
									>
										Tone.js
									</a>{" "}
									— nothing reaches the server until you export.
								</p>
								<MidiArranger />
							</div>

							<div className="doc-section" id="signing">
								<h2>
									<span className="doc-num">2</span>
									Exporting a Content Credential
								</h2>
								<p>
									Pressing <strong>Export to MIDI</strong> sends the pattern to
									the server, where it&rsquo;s built into a real Standard MIDI
									File and signed. The manifest isn&rsquo;t a sidecar or a
									different-format stand-in — it&rsquo;s embedded directly in
									the .mid file itself, as a Sequencer-Specific Meta Event
									placed just before the track&rsquo;s End of Track event, per
									the &ldquo;Embedding manifests into Standard MIDI Files&rdquo;
									section of the C2PA specification draft.
								</p>
								<p>
									A pattern created this way, from nothing, with no prior
									ingredients, is a straightforward <code>c2pa.created</code>{" "}
									action. Since it was assembled by placing notes in a tool
									rather than performed or captured,{" "}
									<code>digitalSourceType</code> would typically be{" "}
									<code>digitalCreation</code> — the same value used for
									anything composed directly in digital form, as covered in{" "}
									<Link href="/info#actions">
										Actions and digitalSourceType
									</Link>
									.
								</p>
								<ManifestPreview
									activeId="urn:c2pa:example-midi-arrangement"
									manifests={[
										{
											id: "urn:c2pa:example-midi-arrangement",
											title: "midi-arrangement.mid",
											claimGenerator: "Mix-O-Tron MIDI Arranger",
											assertions: {
												"c2pa.actions.v2": {
													actions: [
														{
															action: "c2pa.created",
															description:
																"Built a step-sequenced Standard MIDI File.",
															digitalSourceType:
																"http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation",
															softwareAgent: "Mix-O-Tron MIDI Arranger",
														},
													],
												},
											},
										},
									]}
								/>
								<CodeBlock>{`{
  "assertions": {
    "c2pa.actions.v2": {
      "actions": [
        {
          "action": "c2pa.created",
          "description": "Built a step-sequenced Standard MIDI File.",
          "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation",
          "softwareAgent": "Mix-O-Tron MIDI Arranger"
        }
      ]
    }
  }
}`}</CodeBlock>
								<p>
									If the arrangement were instead built from an AI-generated
									pattern, <code>digitalSourceType</code> would move to{" "}
									<code>trainedAlgorithmicMedia</code> — see{" "}
									<Link href="/info#ai-disclosure">
										the AI Disclosure Assertion
									</Link>{" "}
									for how to layer on richer disclosure.
								</p>
							</div>
						</article>
					</div>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}
