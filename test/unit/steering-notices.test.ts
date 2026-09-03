import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleSubagentSteeringNotice, SUBAGENT_STEERING_MESSAGE_TYPE } from "../../src/extension/steering-notices.ts";
import type { SubagentState } from "../../src/shared/types.ts";

function state(sessionId: string): SubagentState {
	return {
		baseCwd: "",
		currentSessionId: sessionId,
		asyncJobs: new Map(),
		foregroundRuns: new Map(),
		foregroundControls: new Map(),
		lastForegroundControlId: null,
		pendingForegroundControlNotices: new Map(),
		cleanupTimers: new Map(),
		lastUiContext: null,
		poller: null,
		completionSeen: new Map(),
		watcher: null,
		watcherRestartTimer: null,
		resultFileCoalescer: { schedule: () => false, clear: () => {} },
	};
}

describe("steering notices", () => {
	it("delivers a failure notice to the matching parent session", () => {
		const messages: unknown[] = [];
		const entries: string[] = [];
		handleSubagentSteeringNotice({
			pi: {
				sendMessage: (message: unknown) => messages.push(message),
				appendEntry: (customType: string) => entries.push(customType),
			} as any,
			state: state("session-1"),
			details: { runId: "run", requestId: "request", state: "failed", message: "not delivered", currentSessionId: "session-1" },
		});
		assert.equal(messages.length, 1);
		assert.equal(entries.length, 1);
		assert.equal(entries[0], SUBAGENT_STEERING_MESSAGE_TYPE);
		assert.match(JSON.stringify(messages[0]), /not delivered/);
	});

	it("suppresses notices owned by another or missing parent session", () => {
		const messages: unknown[] = [];
		for (const currentSessionId of ["session-2", undefined]) {
			handleSubagentSteeringNotice({
				pi: { sendMessage: (message: unknown) => messages.push(message) } as any,
				state: state("session-1"),
				details: { runId: "run", requestId: "request", state: "partial", message: "partial", currentSessionId },
			});
		}
		assert.deepEqual(messages, []);
	});

	it("delivers recovered outcomes without changing their state", () => {
		const messages: Array<{ details?: { state?: string } }> = [];
		handleSubagentSteeringNotice({
			pi: { sendMessage: (message: { details?: { state?: string } }) => messages.push(message) } as any,
			state: state("session-1"),
			details: { runId: "run", requestId: "request", state: "recovered", message: "replacement launched", currentSessionId: "session-1" },
		});
		assert.equal(messages[0]?.details?.state, "recovered");
	});
});
