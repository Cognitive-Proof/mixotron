export function Profiles() {
	return (
		<section id="profiles">
			<div className="wrap">
				<div className="section-head reveal">
					<div className="eyebrow">Creator profiles</div>
					<h2>Add your identity once. Disclose it on your terms.</h2>
				</div>

				<div className="profile-grid">
					<div className="profile-copy reveal">
						<h3>Add your identity once</h3>
						<p>
							Creators and labels often use the same identity information across
							many releases. Mix-O-Tron allows you to create a reusable profile
							so you do not need to enter the same information every time you
							author a new work.
						</p>
						<p style={{ marginTop: "0.8rem" }}>
							Profiles can contain an artist name, media or release name,
							organization, website, CAWG identifier, and social media accounts.
						</p>

						<h3>You control what you disclose</h3>
						<p>
							Not every piece of identity information needs to appear in every
							release. Mix-O-Tron allows users to choose which profile
							information is disclosed when a new C2PA manifest is created —
							maintaining a richer creator profile while publishing only
							what&apos;s appropriate for a particular work.
						</p>
					</div>

					<div className="profile-card reveal">
						<div className="pc-head">Disclosed in this release</div>
						<div className="toggle-row">
							<span>Artist name</span>
							<span className="toggle on" />
						</div>
						<div className="toggle-row">
							<span>Media / label name</span>
							<span className="toggle on" />
						</div>
						<div className="toggle-row">
							<span>Organization</span>
							<span className="toggle" />
						</div>
						<div className="toggle-row">
							<span>Website</span>
							<span className="toggle on" />
						</div>
						<div className="toggle-row">
							<span>CAWG identifier</span>
							<span className="toggle on" />
						</div>
						<div className="toggle-row">
							<span>Social media accounts</span>
							<span className="toggle" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
