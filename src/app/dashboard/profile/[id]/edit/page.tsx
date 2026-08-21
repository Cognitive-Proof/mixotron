"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProfileForm } from "~/app/dashboard/_components/profile-form";
import { api } from "~/trpc/react";

export default function EditProfilePage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const utils = api.useUtils();
	const {
		data: profile,
		isPending,
		error,
	} = api.profile.byId.useQuery({
		id: params.id,
	});
	const updateProfile = api.profile.update.useMutation({
		onSuccess: async () => {
			await utils.profile.list.invalidate();
			router.push("/dashboard/profile");
		},
	});

	if (error) {
		return (
			<>
				<div className="dash-header">
					<div className="eyebrow">Edit profile</div>
					<h1>Profile not found</h1>
					<p>It may have already been deleted.</p>
				</div>
				<Link className="btn btn-ghost" href="/dashboard/profile">
					Back to profiles
				</Link>
			</>
		);
	}

	if (isPending || !profile) return null;

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Edit profile</div>
				<h1>{profile.displayName || "Untitled"}</h1>
				<p>
					Changes apply the next time you author a release with this profile.
				</p>
			</div>

			<ProfileForm
				initialValues={profile}
				onSubmit={(values) =>
					updateProfile.mutate({ id: profile.id, data: values })
				}
				submitLabel={updateProfile.isPending ? "Saving…" : "Save changes"}
			/>
		</>
	);
}
