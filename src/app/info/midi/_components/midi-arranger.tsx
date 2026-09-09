"use client";

import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { base64ToBytes } from "~/lib/client-file";
import { api } from "~/trpc/react";

/** High-to-low so the grid reads like a piano roll. */
const NOTES = [
	"C5",
	"B4",
	"A#4",
	"A4",
	"G#4",
	"G4",
	"F#4",
	"F4",
	"E4",
	"D#4",
	"D4",
	"C#4",
	"C4",
] as const;

type Waveform = "sine" | "triangle" | "square" | "sawtooth";
const WAVEFORMS: { value: Waveform; label: string }[] = [
	{ value: "sine", label: "Sine" },
	{ value: "triangle", label: "Triangle" },
	{ value: "square", label: "Square" },
	{ value: "sawtooth", label: "Sawtooth" },
];

const BAR_OPTIONS = [1, 2, 4] as const;

function cellKey(noteIndex: number, step: number): string {
	return `${noteIndex}:${step}`;
}

function notesAtStep(step: number, cells: Set<string>): string[] {
	const notes: string[] = [];
	NOTES.forEach((note, noteIndex) => {
		if (cells.has(cellKey(noteIndex, step))) notes.push(note);
	});
	return notes;
}

function cellsToNotes(cells: Set<string>): { note: string; step: number }[] {
	return Array.from(cells).map((key) => {
		const [noteIndexPart, stepPart] = key.split(":");
		const noteIndex = Number(noteIndexPart);
		return { note: NOTES[noteIndex] ?? "C4", step: Number(stepPart) };
	});
}

export function MidiArranger() {
	const exportMutation = api.midi.exportSigned.useMutation();

	const [activeCells, setActiveCells] = useState<Set<string>>(() => new Set());
	const [bars, setBars] = useState<number>(1);
	const [bpm, setBpm] = useState(120);
	const [waveform, setWaveform] = useState<Waveform>("triangle");
	const [isPlaying, setIsPlaying] = useState(false);
	const [playingStep, setPlayingStep] = useState(-1);
	const [exportError, setExportError] = useState<string | null>(null);

	const steps = bars * 16;
	const isEmpty = activeCells.size === 0;

	const cellsRef = useRef(activeCells);
	useEffect(() => {
		cellsRef.current = activeCells;
	}, [activeCells]);

	const synthRef = useRef<Tone.PolySynth | null>(null);
	const sequenceRef = useRef<Tone.Sequence<number> | null>(null);

	useEffect(() => {
		return () => {
			sequenceRef.current?.dispose();
			synthRef.current?.dispose();
			Tone.getTransport().stop();
			Tone.getTransport().cancel();
		};
	}, []);

	useEffect(() => {
		if (isPlaying) Tone.getTransport().bpm.value = bpm;
	}, [bpm, isPlaying]);

	useEffect(() => {
		if (isPlaying) synthRef.current?.set({ oscillator: { type: waveform } });
	}, [waveform, isPlaying]);

	function toggleCell(noteIndex: number, step: number) {
		setActiveCells((prev) => {
			const key = cellKey(noteIndex, step);
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}

	function clearGrid() {
		setActiveCells(new Set());
	}

	async function handlePlay() {
		await Tone.start();
		const transport = Tone.getTransport();
		transport.bpm.value = bpm;

		if (!synthRef.current) {
			synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
		}
		synthRef.current.set({ oscillator: { type: waveform } });

		sequenceRef.current?.dispose();
		const stepIndices = Array.from({ length: steps }, (_, i) => i);
		const seq = new Tone.Sequence<number>(
			(time, step) => {
				const notes = notesAtStep(step, cellsRef.current);
				if (notes.length > 0) {
					synthRef.current?.triggerAttackRelease(notes, "16n", time);
				}
				Tone.getDraw().schedule(() => setPlayingStep(step), time);
			},
			stepIndices,
			"16n",
		);
		seq.start(0);
		sequenceRef.current = seq;
		transport.start();
		setIsPlaying(true);
	}

	function handleStop() {
		Tone.getTransport().stop();
		Tone.getTransport().cancel();
		sequenceRef.current?.dispose();
		sequenceRef.current = null;
		setIsPlaying(false);
		setPlayingStep(-1);
	}

	async function handleExportToMidi() {
		if (isEmpty) return;
		setExportError(null);
		try {
			const result = await exportMutation.mutateAsync({
				bpm,
				steps,
				notes: cellsToNotes(activeCells),
				voice: waveform,
			});
			const bytes = base64ToBytes(result.signedAssetBase64);
			const blob = new Blob([bytes], { type: "audio/midi" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = result.fileName;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Failed to export signed MIDI", error);
			setExportError(error instanceof Error ? error.message : "Export failed.");
		}
	}

	return (
		<div className="midi-tool">
			<div className="midi-controls">
				<div className="midi-control">
					<label htmlFor="midi-bpm">Tempo</label>
					<input
						id="midi-bpm"
						max={200}
						min={60}
						onChange={(e) => setBpm(Number(e.target.value))}
						type="number"
						value={bpm}
					/>
				</div>
				<div className="midi-control">
					<label htmlFor="midi-bars">Bars</label>
					<select
						disabled={isPlaying}
						id="midi-bars"
						onChange={(e) => setBars(Number(e.target.value))}
						value={bars}
					>
						{BAR_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</div>
				<div className="midi-control">
					<label htmlFor="midi-waveform">Voice</label>
					<select
						id="midi-waveform"
						onChange={(e) => setWaveform(e.target.value as Waveform)}
						value={waveform}
					>
						{WAVEFORMS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
				<div className="midi-transport">
					<button className="btn btn-ghost" onClick={clearGrid} type="button">
						Clear
					</button>
					<button
						className="btn btn-primary"
						onClick={isPlaying ? handleStop : handlePlay}
						type="button"
					>
						{isPlaying ? "Stop" : "Play"}
					</button>
				</div>
			</div>

			<div className="midi-grid-scroll">
				<div className="midi-grid">
					{NOTES.map((note, noteIndex) => (
						<div className="midi-row" key={note}>
							<div
								className={`midi-row-label ${note.includes("#") ? "is-sharp" : ""}`}
							>
								{note}
							</div>
							{Array.from({ length: steps }, (_, step) => step).map((step) => (
								<button
									aria-label={`${note} step ${step + 1}`}
									aria-pressed={activeCells.has(cellKey(noteIndex, step))}
									className={[
										"midi-cell",
										activeCells.has(cellKey(noteIndex, step)) ? "is-on" : "",
										step % 4 === 0 ? "is-beat" : "",
										playingStep === step ? "is-playhead" : "",
									]
										.filter(Boolean)
										.join(" ")}
									key={step}
									onClick={() => toggleCell(noteIndex, step)}
									type="button"
								/>
							))}
						</div>
					))}
				</div>
			</div>

			<div className="midi-export-row">
				<button
					className="btn btn-primary"
					disabled={isEmpty || exportMutation.isPending}
					onClick={handleExportToMidi}
					type="button"
				>
					{exportMutation.isPending ? "Signing…" : "Export to MIDI"}
				</button>
				<span className="field-hint">
					Builds a real .mid file from this pattern and signs it server-side
					with an embedded C2PA manifest.
				</span>
			</div>
			{exportError && <div className="form-error">{exportError}</div>}
		</div>
	);
}
