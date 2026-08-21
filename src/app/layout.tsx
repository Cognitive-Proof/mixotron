import "~/styles/globals.css";
import "c2pa-react-component/style.css";
import "c2pa-react-cawg-component/style.css";

import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Unbounded } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Mix-O-Tron",
	description:
		"Mix-O-Tron is an open-source C2PA authoring tool for the music industry — create Content Credentials for original recordings, trace samples and remixes back to their sources, and carry licensing information with music as it moves into podcasts, video, and new works.",
};

const unbounded = Unbounded({
	subsets: ["latin"],
	weight: ["500", "700", "800", "900"],
	variable: "--font-display",
});

const ibmPlexSans = IBM_Plex_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-body",
});

const ibmPlexMono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-mono",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			className={`${unbounded.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
			lang="en"
		>
			<body>
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
