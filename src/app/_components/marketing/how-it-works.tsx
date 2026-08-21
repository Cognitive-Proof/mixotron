export function HowItWorks() {
	return (
		<section className="section-alt" id="how-it-works">
			<div className="wrap">
				<div className="section-head reveal">
					<div className="eyebrow">How it works</div>
					<h2>From finished track to published Content Credential</h2>
					<p>
						Six steps carry a release from your profile through authoring,
						signing, and publication.
					</p>
				</div>

				<div className="timeline timeline--rose">
					<div className="t-step reveal">
						<div className="t-num">1</div>
						<h3>Create your profile</h3>
						<p>
							Set up the information you want associated with the work you
							create. You decide which information is disclosed in the Content
							Credentials you create.
						</p>
						<div className="field-grid">
							<span className="field-chip">Artist name</span>
							<span className="field-chip">Media / label name</span>
							<span className="field-chip">Organization</span>
							<span className="field-chip">Website</span>
							<span className="field-chip">CAWG identifier</span>
							<span className="field-chip">Social accounts</span>
						</div>
					</div>
					<div className="t-step reveal">
						<div className="t-num">2</div>
						<h3>Add your finished work</h3>
						<p>
							Upload the final version of the music, podcast, video, remix, or
							other supported media you want to publish. Mix-O-Tron works with
							finished media rather than replacing professional production tools
							— create wherever you normally work, then bring the final file in.
						</p>
					</div>
					<div className="t-step reveal">
						<div className="t-num">3</div>
						<h3>Add your ingredients</h3>
						<p>
							If the work contains existing C2PA-enabled music, add those files
							as ingredients. Mix-O-Tron verifies their manifests and allows the
							resulting work to preserve those relationships.
						</p>
						<p>
							A release can contain up to 20 ingredients plus the final output.
							If the work is completely original, simply continue without
							ingredients.
						</p>
					</div>
					<div className="t-step reveal">
						<div className="t-num">4</div>
						<h3>Review provenance and rights</h3>
						<p>
							Inspect the Content Credentials and trust information associated
							with your ingredients. Confirm who created the source material,
							where it came from, and whether any applicable licensing
							authorization exists.
						</p>
					</div>
					<div className="t-step reveal">
						<div className="t-num">5</div>
						<h3>Author the new manifest</h3>
						<p>
							Mix-O-Tron creates a C2PA manifest describing the final work and
							its ingredients. Signing is handled through{" "}
							<strong>Sign-O-Tron</strong>, a separate signing API designed to
							keep cryptographic signing infrastructure independent from the
							authoring interface.
						</p>
					</div>
					<div className="t-step reveal">
						<div className="t-num">6</div>
						<h3>Publish</h3>
						<p>
							Download the finished C2PA-enabled media and publish it normally.
							Its Content Credentials now carry the provenance relationships
							created during the Mix-O-Tron workflow.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
