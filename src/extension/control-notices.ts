import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { controlNotificationKey, formatControlNoticeMessage } from "../runs/shared/subagent-control.ts";
import { appendSessionJournalEntry, sessionJournalEntry, type SessionJournalEntry, type SessionJournalWriter } from "../shared/session-journal.ts";
import type { ControlEvent } from "../shared/types.ts";

export const SUBAGENT_CONTROL_MESSAGE_TYPE = "subagent_control_notice";

export interface SubagentControlMessageDetails {
	event: ControlEvent;
	source?: "foreground" | "async" | "goal";
	asyncDir?: string;
	childIntercomTarget?: string;
	noticeText?: string;
}

export function controlNoticeTarget(details: SubagentControlMessageDetails): string | undefined {
	return details.childIntercomTarget;
}

export function formatSubagentControlNotice(details: SubagentControlMessageDetails, content?: string): string {
	return details.noticeText ?? content ?? formatControlNoticeMessage(details.event, controlNoticeTarget(details));
}

type ControlNoticePi = Pick<ExtensionAPI, "sendMessage"> & SessionJournalWriter;

function controlDetailsFromJournalEntry(value: SessionJournalEntry | null | undefined): SubagentControlMessageDetails | undefined {
	const entry = sessionJournalEntry(value);
	if (!entry || entry.type !== "custom" && entry.type !== "custom_message") return undefined;
	if (entry.customType !== SUBAGENT_CONTROL_MESSAGE_TYPE) return undefined;
	const details = entry.type === "custom" ? entry.data : entry.details;
	if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
	// SAFETY: the guard above establishes that details is a non-array object;
	// the parsed fields below are validated before this function returns.
	const candidate = details as Partial<SubagentControlMessageDetails>;
	const event = candidate.event;
	if (!event || typeof event !== "object" || Array.isArray(event)) return undefined;
	// SAFETY: the guard above establishes that event is a non-array object;
	// each required ControlEvent field is validated immediately below.
	const controlEvent = event as Partial<ControlEvent>;
	if ((controlEvent.type !== "active_long_running" && controlEvent.type !== "needs_attention")
		|| (controlEvent.to !== "active_long_running" && controlEvent.to !== "needs_attention")
		|| typeof controlEvent.ts !== "number"
		|| typeof controlEvent.runId !== "string"
		|| typeof controlEvent.agent !== "string"
		|| typeof controlEvent.message !== "string") return undefined;
	// SAFETY: event has passed every required ControlEvent field check above;
	// candidate is the journal details object that contains that event.
	return candidate as SubagentControlMessageDetails;
}

export function restoreVisibleControlNotices(entries: readonly SessionJournalEntry[] | undefined, target = new Set<string>()): number {
	target.clear();
	if (!Array.isArray(entries)) return 0;
	for (const value of entries) {
		const details = controlDetailsFromJournalEntry(value);
		if (!details) continue;
		target.add(controlNotificationKey(details.event, controlNoticeTarget(details)));
	}
	return target.size;
}

function deliverControlNotice(input: {
	pi: ControlNoticePi;
	visibleControlNotices: Set<string>;
	details: SubagentControlMessageDetails;
}): void {
	const childIntercomTarget = controlNoticeTarget(input.details);
	const key = controlNotificationKey(input.details.event, childIntercomTarget);
	if (input.visibleControlNotices.has(key)) return;
	input.visibleControlNotices.add(key);
	const noticeText = input.details.noticeText ?? formatControlNoticeMessage(input.details.event, childIntercomTarget);
	const journalDetails = { ...input.details, childIntercomTarget, noticeText };
	input.pi.sendMessage(
		{
			customType: SUBAGENT_CONTROL_MESSAGE_TYPE,
			content: noticeText,
			display: true,
			details: journalDetails,
		},
		{ triggerTurn: input.details.source === "async" },
	);
	appendSessionJournalEntry(input.pi, SUBAGENT_CONTROL_MESSAGE_TYPE, journalDetails);
}

export function handleSubagentControlNotice(input: {
	pi: ControlNoticePi;
	visibleControlNotices: Set<string>;
	details: SubagentControlMessageDetails;
}): void {
	if (!input.details?.event || input.details.event.type === "active_long_running") return;
	if (input.details.source === "foreground") {
		// A foreground tool blocks Pi from displaying this message. The run can
		// finish before Pi flushes it, and queued messages cannot be withdrawn.
		// Foreground control remains available through the live tool and fleet state.
		return;
	}
	deliverControlNotice(input);
}
