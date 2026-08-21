"use client";

import { useEffect } from "react";

const WAVE_COLORS = ["#DD517F", "#E68E36", "#556DC8", "#7998EE"];
const BAR_COUNT = 48;

export function SiteEffects() {
	useEffect(() => {
		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		// reveal on scroll
		const revealEls = document.querySelectorAll<HTMLElement>(".reveal");
		let observer: IntersectionObserver | undefined;
		if ("IntersectionObserver" in window && !reduceMotion) {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							entry.target.classList.add("in-view");
							observer?.unobserve(entry.target);
						}
					}
				},
				{ threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
			);
			for (const el of revealEls) observer.observe(el);
		} else {
			for (const el of revealEls) el.classList.add("in-view");
		}

		// hero equalizer canvas
		const canvas = document.getElementById(
			"waveform",
		) as HTMLCanvasElement | null;
		let raf = 0;

		if (canvas) {
			const ctx = canvas.getContext("2d");
			const dpr = Math.min(window.devicePixelRatio || 1, 2);

			const resize = () => {
				const rect = canvas.parentElement?.getBoundingClientRect();
				if (!rect) return;
				canvas.width = rect.width * dpr;
				canvas.height = rect.height * dpr;
				canvas.style.width = `${rect.width}px`;
				canvas.style.height = `${rect.height}px`;
			};
			resize();
			window.addEventListener("resize", resize);

			let t = 0;
			const draw = () => {
				if (!ctx) return;
				const w = canvas.width;
				const h = canvas.height;
				ctx.clearRect(0, 0, w, h);
				const gap = w / BAR_COUNT;
				for (let i = 0; i < BAR_COUNT; i++) {
					const phase = i * 0.35;
					const amp =
						(Math.sin(t * 0.9 + phase) * 0.5 + 0.5) *
						(Math.sin(t * 0.35 + i * 0.12) * 0.3 + 0.7);
					const bh = h * (0.06 + amp * 0.4);
					const x = i * gap + gap * 0.22;
					const bw = gap * 0.56;
					const y = h - bh;
					ctx.fillStyle = WAVE_COLORS[i % WAVE_COLORS.length] ?? "#DD517F";
					ctx.globalAlpha = 0.55;
					ctx.beginPath();
					if (ctx.roundRect) {
						ctx.roundRect(x, y, bw, bh, bw / 2);
					} else {
						ctx.rect(x, y, bw, bh);
					}
					ctx.fill();
				}
				ctx.globalAlpha = 1;
			};

			if (reduceMotion) {
				draw();
			} else {
				const loop = () => {
					t += 0.02;
					draw();
					raf = requestAnimationFrame(loop);
				};
				raf = requestAnimationFrame(loop);
			}

			return () => {
				window.removeEventListener("resize", resize);
				if (raf) cancelAnimationFrame(raf);
				observer?.disconnect();
			};
		}

		return () => {
			observer?.disconnect();
		};
	}, []);

	return null;
}
