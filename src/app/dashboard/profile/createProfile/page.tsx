"use client";

import { useRouter } from "next/navigation";
import { ProfileForm } from "~/app/dashboard/_components/profile-form";
import { api } from "~/trpc/react";

export default function CreateProfilePage() {
	const router = useRouter();
	const utils = api.useUtils();
	const { data: profiles, isPending } = api.profile.list.useQuery();
	const createProfile = api.profile.create.useMutation({
		onSuccess: async () => {
			await utils.profile.list.invalidate();
			router.push("/dashboard/profile");
		},
	});

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Create profile</div>
				<h1>
					{!isPending && profiles?.length === 0
						? "Set up your first profile"
						: "Add a new profile"}
				</h1>
				<p>
					This information can be reused across releases. You&apos;ll choose
					what to disclose each time you author.
				</p>
			</div>

			<ProfileForm
				onSubmit={(values) => createProfile.mutate(values)}
				submitLabel={createProfile.isPending ? "Creating…" : "Create profile"}
			/>
		</>
	);
}
