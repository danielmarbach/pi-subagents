import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export interface SessionJournalEntry {
	type?: unknown;
	customType?: unknown;
	data?: unknown;
	details?: unknown;
}

export type SessionJournalWriter = Partial<Pick<ExtensionAPI, "appendEntry">>;

export function appendSessionJournalEntry(
	writer: SessionJournalWriter | undefined,
	customType: string,
	data: Parameters<ExtensionAPI["appendEntry"]>[1],
): boolean {
	if (writer?.appendEntry === undefined) return false;
	try {
		writer.appendEntry(customType, data);
		return true;
	} catch {
		// Journal persistence is advisory; a notice or completed run must not be
		// dropped because an in-memory/test session cannot append its entry.
		return false;
	}
}

export function sessionJournalEntry(value: SessionJournalEntry | null | undefined): SessionJournalEntry | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
	return value;
}

export interface CustomJournalEntries {
	present: boolean;
	data: unknown[];
}

export function readCustomJournalEntries(entries: readonly SessionJournalEntry[] | undefined, customType: string): CustomJournalEntries {
	if (!Array.isArray(entries)) return { present: false, data: [] };
	const data: unknown[] = [];
	let present = false;
	for (const value of entries) {
		const entry = sessionJournalEntry(value);
		if (entry?.type !== "custom" || entry.customType !== customType) continue;
		present = true;
		data.push(entry.data);
	}
	return { present, data };
}
