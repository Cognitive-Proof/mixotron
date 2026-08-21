export function Architecture() {
	return (
		<section className="section-alt" id="architecture">
			<div className="wrap">
				<div className="section-head reveal">
					<div className="eyebrow">Technical architecture</div>
					<h2>Small services, clear responsibilities</h2>
					<p>
						Mix-O-Tron separates authoring, signing, and authorization into
						distinct components.
					</p>
				</div>

				<div className="rack reveal">
					<div className="module">
						<div className="m-head">
							<span className="led led--rose" />
							<span className="m-name">Mix-O-Tron</span>
						</div>
						<div className="m-role">Authoring &amp; user experience</div>
						<p>
							The primary web application. Handles media uploads, creator
							profiles, ingredient selection, and manifest authoring.
						</p>
						<ul>
							<li>C2PA manifest inspection</li>
							<li>Provenance presentation</li>
							<li>Licensing workflows</li>
							<li>Trust-registry verification</li>
						</ul>
						<p style={{ marginTop: "0.9rem", fontSize: "0.85rem" }}>
							A future desktop version may use Electron while maintaining the
							same general workflow.
						</p>
					</div>

					<div className="module">
						<div className="m-head">
							<span className="led led--amber" />
							<span className="m-name">Sign-O-Tron</span>
						</div>
						<div className="m-role">C2PA signing infrastructure</div>
						<p>
							Mix-O-Tron does not need to directly manage all signing
							operations. Completed manifests are passed to Sign-O-Tron, a
							dedicated API responsible for C2PA signing.
						</p>
						<p>
							Separating signing from the main application makes it easier to
							isolate signing credentials and operate signing infrastructure
							independently from the user interface.
						</p>
					</div>

					<div className="module">
						<div className="m-head">
							<span className="led led--indigo" />
							<span className="m-name">Trust Registry</span>
						</div>
						<div className="m-role">
							Authorization &amp; licensing information
						</div>
						<p>
							A separate microservice that stores and answers questions about
							rights and authorization.
						</p>
						<p
							className="mono"
							style={{
								marginTop: "0.9rem",
								fontSize: "0.85rem",
								color: "var(--ink)",
							}}
						>
							Authority &#8594; Licensee &#8594; Action &#8594; Song &#8594;
							Licence Conditions
						</p>
						<p>
							Mix-O-Tron can query this service when verifying source material,
							and reference the resulting authorization from newly authored
							Content Credentials.
						</p>
					</div>
				</div>

				<div className="triad reveal">
					<div className="triad-item">
						<div className="triad-ring triad-ring--rose">
							<svg
								fill="none"
								height="26"
								stroke="currentColor"
								strokeLinecap="round"
								strokeWidth="1.6"
								viewBox="0 0 24 24"
								width="26"
							>
								<title>Provenance</title>
								<path d="M2 12h2l1.5-6 3 15 3-19 3 15 2-5H22" />
							</svg>
						</div>
						<h4>Provenance</h4>
						<p>Where did this music come from?</p>
					</div>
					<div className="triad-item">
						<div className="triad-ring triad-ring--amber">
							<svg
								fill="none"
								height="26"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1.6"
								viewBox="0 0 24 24"
								width="26"
							>
								<title>Identity</title>
								<circle cx="12" cy="8" r="3.4" />
								<path d="M5 20c1.2-3.8 4-5.6 7-5.6s5.8 1.8 7 5.6" />
							</svg>
						</div>
						<h4>Identity</h4>
						<p>Who created or published it?</p>
					</div>
					<div className="triad-item">
						<div className="triad-ring triad-ring--indigo">
							<svg
								fill="none"
								height="26"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1.6"
								viewBox="0 0 24 24"
								width="26"
							>
								<title>Rights</title>
								<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
							</svg>
						</div>
						<h4>Rights</h4>
						<p>Does this person have permission to use it?</p>
					</div>
				</div>

				<p className="triad-closing reveal">
					Content Credentials that describe more than a file — the lifecycle of
					music.
				</p>
			</div>
		</section>
	);
}
