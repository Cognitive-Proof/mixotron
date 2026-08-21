export function Licensing() {
	return (
		<section id="licensing">
			<div className="wrap">
				<div className="section-head reveal">
					<div className="eyebrow">Licensing music</div>
					<h2>License music, and prove you have permission to use it</h2>
					<p>
						Mix-O-Tron can support more than attribution. A deployment can offer
						a catalog of music the operator has permission to license to other
						creators — for example, a podcast producer selecting a song,
						purchasing a licence, and using it in a new episode.
					</p>
				</div>

				<div
					className="reveal"
					style={{ maxWidth: 640, marginBottom: "3.2rem" }}
				>
					<div className="ticket">
						<div className="ticket-title">Result</div>
						<p
							style={{
								fontFamily: "var(--font-display), sans-serif",
								fontSize: "1.3rem",
								fontWeight: 700,
								maxWidth: "28ch",
							}}
						>
							&ldquo;This creator has permission to use this music.&rdquo;
						</p>
					</div>
				</div>

				<div className="timeline timeline--indigo reveal">
					<div className="t-step">
						<div className="t-num">1</div>
						<h3>Select music</h3>
						<p>
							Browse music available for licensing through the Mix-O-Tron
							deployment.
						</p>
					</div>
					<div className="t-step">
						<div className="t-num">2</div>
						<h3>Purchase a licence</h3>
						<p>
							Select the permitted use and complete the licensing transaction.
						</p>
						<div className="ticket" style={{ marginTop: "1.1rem" }}>
							<div className="ticket-title">Licence</div>
							<dl>
								<dt>Song</dt>
								<dd>—</dd>
								<dt>Licensee</dt>
								<dd>—</dd>
								<dt>Permitted use</dt>
								<dd>—</dd>
								<dt>Use type</dt>
								<dd>Commercial / non-commercial</dd>
								<dt>Territory</dt>
								<dd>—</dd>
								<dt>Duration</dt>
								<dd>—</dd>
								<dt>Licence ID</dt>
								<dd>—</dd>
								<dt>Receipt</dt>
								<dd>—</dd>
							</dl>
						</div>
					</div>
					<div className="t-step">
						<div className="t-num">3</div>
						<h3>Create your work</h3>
						<p>
							Download the licensed music and use it in your podcast, video,
							remix, or other production. Mix-O-Tron does not need to replace
							your existing creative tools.
						</p>
					</div>
					<div className="t-step">
						<div className="t-num">4</div>
						<h3>Upload the finished work</h3>
						<p>
							When the production is complete, upload the finished media to
							Mix-O-Tron.
						</p>
					</div>
					<div className="t-step">
						<div className="t-num">5</div>
						<h3>Add the licensed song as an ingredient</h3>
						<p>
							The licensed recording becomes an ingredient in the new C2PA
							manifest.
						</p>
					</div>
					<div className="t-step">
						<div className="t-num">6</div>
						<h3>Register the authorization</h3>
						<p>
							The licensing authorization is recorded in a separate trust
							registry. The resulting C2PA data can reference that authorization
							so a verifier can determine whether the creator has permission to
							use the music.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
