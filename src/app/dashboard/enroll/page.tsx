import { redirect } from "next/navigation";

/** /dashboard/enroll merged into /dashboard/sign, which recognizes both
 * Governorator enrollment requests and DIDsmith key-link requests from
 * whatever's pasted — this stub just catches old bookmarks/links. */
export default function EnrollRedirect() {
	redirect("/dashboard/sign");
}
