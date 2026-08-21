export function Trust() {
	return (
		<section className="section-alt" id="trust">
			<div className="wrap">
				<div className="section-head reveal">
					<div className="eyebrow">Trust &amp; licensing</div>
					<h2>Rights information that can be verified</h2>
					<p>
						Licensing information is maintained separately from the media itself
						using a trust-registry service. Mix-O-Tron uses a TRQP-style
						authorization model, so a verifier can determine whether a licence
						is currently valid without the entire licensing record being
						embedded in the media.
					</p>
				</div>

				<div className="trust-grid">
					<div className="data-card reveal">
						<div className="dc-label">Authorization record</div>
						<div className="field">
							<span className="k">authority_id</span>
							<span className="v">—</span>
						</div>
						<div className="field">
							<span className="k">entity_id</span>
							<span className="v">—</span>
						</div>
						<div className="field">
							<span className="k">action</span>
							<span className="v">—</span>
						</div>
						<div className="field">
							<span className="k">resource</span>
							<span className="v">—</span>
						</div>
						<div className="field">
							<span className="k">context</span>
							<span className="v">—</span>
						</div>
						<div className="dc-context">
							<span className="k" style={{ color: "#CBAAD4" }}>
								context may include
							</span>
							<ul>
								<li>Commercial or non-commercial rights</li>
								<li>Territory</li>
								<li>Duration</li>
								<li>Licensee</li>
								<li>Licence identifier</li>
								<li>Permitted use</li>
							</ul>
						</div>
					</div>

					<div className="states reveal">
						<div className="state-card good">
							<span className="state-dot" />
							<div>
								<h4>WORKING</h4>
								<p>
									The authorization is valid. Content Credentials referencing it
									can be trusted for the licensed use.
								</p>
							</div>
						</div>
						<div className="state-card bad">
							<span className="state-dot" />
							<div>
								<h4>REVOKED</h4>
								<p>
									The authorization has been withdrawn. A verifier checking the
									registry will see the licence is no longer in force.
								</p>
							</div>
						</div>
						<p
							style={{
								color: "var(--ink-soft)",
								fontSize: "0.92rem",
								marginTop: "0.3rem",
							}}
						>
							The Content Credentials for the final work can reference the
							relevant trust-registry authorization directly.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
