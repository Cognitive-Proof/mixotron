import { redirect } from "next/navigation";
import { DashboardShell } from "~/app/dashboard/_components/dashboard-shell";
import { getSession } from "~/server/better-auth/server";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getSession();
	if (!session) {
		redirect("/");
	}

	return (
		<DashboardShell userEmail={session.user.email} userName={session.user.name}>
			{children}
		</DashboardShell>
	);
}
