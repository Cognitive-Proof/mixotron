const TICKS_PER_QUARTER_NOTE = 480;
const TICKS_PER_STEP = TICKS_PER_QUARTER_NOTE / 4;
const CHANNEL = 0;
const VELOCITY = 100;

const PITCH_CLASS: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

/** "C5", "A#4" -> MIDI note number, using the MIDI/Tone.js convention where
 * note 60 ("C4") is middle C. */
export function noteNameToMidiNumber(name: string): number {
	const match = /^(?<letter>[A-G])(?<sharp>#)?(?<octave>-?\d+)$/.exec(name);
	if (!match?.groups) throw new Error(`Invalid note name: "${name}"`);
	const { letter, sharp, octave } = match.groups;
	const semitone = (PITCH_CLASS[letter ?? ""] ?? 0) + (sharp ? 1 : 0);
	return (Number(octave ?? "0") + 1) * 12 + semitone;
}

function encodeVlq(value: number): number[] {
	const bytes = [value & 0x7f];
	let remaining = value >>> 7;
	while (remaining > 0) {
		bytes.push((remaining & 0x7f) | 0x80);
		remaining >>>= 7;
	}
	bytes.reverse();
	return bytes;
}

function u32Bytes(value: number): number[] {
	return [
		(value >>> 24) & 0xff,
		(value >>> 16) & 0xff,
		(value >>> 8) & 0xff,
		value & 0xff,
	];
}

export interface MidiExportNote {
	note: string;
	step: number;
}

export interface MidiExportInput {
	bpm: number;
	steps: number;
	notes: MidiExportNote[];
	/** General MIDI program number (0-127). */
	program: number;
}

/** Builds a Standard MIDI File (format 0, single track) from a step-grid
 * arrangement — one Sequencer-Specific Meta Event's worth of room is left
 * implicit for c2pa-rs-text-support's MidiIO handler to fill in with the
 * signed manifest, immediately before the End of Track event. */
export function buildStandardMidiFile(input: MidiExportInput): Uint8Array {
	type TrackEvent = { tick: number; order: number; bytes: number[] };
	const events: TrackEvent[] = [];

	for (const { note, step } of input.notes) {
		const midiNote = noteNameToMidiNumber(note);
		const onTick = step * TICKS_PER_STEP;
		const offTick = onTick + Math.max(1, Math.round(TICKS_PER_STEP * 0.9));
		// Note-offs sort before note-ons at the same tick (order 0 vs 1) so a
		// note ending and another starting on the same step never overlap.
		events.push({
			tick: onTick,
			order: 1,
			bytes: [0x90 | CHANNEL, midiNote, VELOCITY],
		});
		events.push({
			tick: offTick,
			order: 0,
			bytes: [0x80 | CHANNEL, midiNote, 0],
		});
	}
	events.sort((a, b) => a.tick - b.tick || a.order - b.order);

	const trackBytes: number[] = [];
	function pushEvent(deltaTicks: number, bytes: number[]) {
		trackBytes.push(...encodeVlq(deltaTicks), ...bytes);
	}

	const microsPerQuarter = Math.round(60_000_000 / input.bpm);
	pushEvent(0, [
		0xff,
		0x51,
		0x03,
		(microsPerQuarter >> 16) & 0xff,
		(microsPerQuarter >> 8) & 0xff,
		microsPerQuarter & 0xff,
	]);
	pushEvent(0, [0xc0 | CHANNEL, input.program]);

	let lastTick = 0;
	for (const event of events) {
		pushEvent(event.tick - lastTick, event.bytes);
		lastTick = event.tick;
	}

	const endTick = Math.max(lastTick, input.steps * TICKS_PER_STEP);
	pushEvent(endTick - lastTick, [0xff, 0x2f, 0x00]);

	const header = [
		0x4d,
		0x54,
		0x68,
		0x64, // "MThd"
		...u32Bytes(6),
		0x00,
		0x00, // format 0
		0x00,
		0x01, // ntrks = 1
		(TICKS_PER_QUARTER_NOTE >> 8) & 0xff,
		TICKS_PER_QUARTER_NOTE & 0xff,
	];

	const trackHeader = [
		0x4d,
		0x54,
		0x72,
		0x6b, // "MTrk"
		...u32Bytes(trackBytes.length),
	];

	return new Uint8Array([...header, ...trackHeader, ...trackBytes]);
}
