import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendSessionJournalEntry, type SessionJournalWriter } from "../shared/session-journal.ts";
import type { SteeringNotice, SubagentState } from "../shared/types.ts";

export const SUBAGENT_STEERING_MESSAGE_TYPE = "subagent_steering_notice";

export interface SubagentSteeringMessageDetails extends SteeringNotice {
	source?: "async";
	asyncDir?: string;
	noticeText?: string;
}

export function formatSteeringNotice(details: Pick<SubagentSteeringMessageDetails, "runId" | "requestId" | "state" | "message">): string {
	return [
		`Subagent steering ${details.state}: ${details.runId}`,
		`Request: ${details.requestId}`,
		details.message,
		"Inspect the run status before sending another correction.",
	].join("\n");
}

type SteeringNoticePi = Pick<ExtensionAPI, "sendMessage"> & SessionJournalWriter;

export function handleSubagentSteeringNotice(input: {
	pi: SteeringNoticePi;
	state: SubagentState;
	details: SubagentSteeringMessageDetails;
}): void {
	if (!input.details || (input.details.state !== "failed" && input.details.state !== "partial" && input.details.state !== "recovered")) return;
	if (!input.state.currentSessionId || input.details.currentSessionId !== input.state.currentSessionId) return;
	const noticeText = input.details.noticeText ?? formatSteeringNotice(input.details);
	const journalDetails = { ...input.details, noticeText };
	input.pi.sendMessage({
		customType: SUBAGENT_STEERING_MESSAGE_TYPE,
		content: noticeText,
		display: true,
		details: journalDetails,
	}, { triggerTurn: true });
	appendSessionJournalEntry(input.pi, SUBAGENT_STEERING_MESSAGE_TYPE, journalDetails);
}
