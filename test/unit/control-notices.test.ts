import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleSubagentControlNotice, restoreVisibleControlNotices, SUBAGENT_CONTROL_MESSAGE_TYPE } from "../../src/extension/control-notices.ts";
import { controlNotificationKey } from "../../src/runs/shared/subagent-control.ts";
import type { ControlEvent } from "../../src/shared/types.ts";

function needsAttentionEvent(overrides: Partial<ControlEvent> = {}): ControlEvent {
	return {
		type: "needs_attention",
		to: "needs_attention",
		ts: 1,
		runId: "run-1",
		agent: "worker",
		index: 0,
		message: "worker needs attention",
		reason: "idle",
		...overrides,
	};
}

function makeRecorder() {
	const sent: Array<{ message: unknown; options: unknown }> = [];
	const entries: string[] = [];
	return {
		sent,
		entries,
		pi: {
			sendMessage(message: unknown, options: unknown) {
				sent.push({ message, options });
			},
			appendEntry(customType: string) {
				entries.push(customType);
			},
		},
	};
}

describe("subagent control notice delivery", () => {
	it("delivers async needs-attention notices immediately", () => {
		const recorder = makeRecorder();

		handleSubagentControlNotice({
			pi: recorder.pi,
			visibleControlNotices: new Set(),
			details: { source: "async", event: needsAttentionEvent() },
		});

		assert.equal(recorder.sent.length, 1);
		assert.equal(recorder.entries.length, 1);
		assert.equal(recorder.entries[0], SUBAGENT_CONTROL_MESSAGE_TYPE);
		assert.deepEqual(recorder.sent[0]?.options, { triggerTurn: true });
	});

	it("delivers goal notices without starting a new turn", () => {
		const recorder = makeRecorder();

		handleSubagentControlNotice({
			pi: recorder.pi,
			visibleControlNotices: new Set(),
			details: { source: "goal", event: needsAttentionEvent(), noticeText: "Goal is ready." },
		});

		assert.equal(recorder.sent.length, 1);
		assert.equal(recorder.entries.length, 1);
		assert.deepEqual(recorder.sent[0]?.options, { triggerTurn: false });
	});

	it("does not queue a foreground notice that Pi could flush after completion", () => {
		const queued: Array<{ message: unknown; options: unknown }> = [];
		const visible: Array<{ message: unknown; options: unknown }> = [];
		const pi = {
			sendMessage(message: unknown, options: unknown) {
				queued.push({ message, options });
			},
		};

		handleSubagentControlNotice({
			pi,
			visibleControlNotices: new Set(),
			details: { source: "foreground", event: needsAttentionEvent() },
		});
		visible.push(...queued);

		assert.deepEqual(visible, []);
	});

	it("rebuilds visible notice keys from the selected branch", () => {
		const first = needsAttentionEvent({ runId: "first" });
		const second = needsAttentionEvent({ runId: "second" });
		const visible = new Set(["stale"]);
		assert.equal(restoreVisibleControlNotices([
			{ type: "custom", customType: SUBAGENT_CONTROL_MESSAGE_TYPE, data: { source: "async", event: first } },
		], visible), 1);
		assert.equal(visible.has(controlNotificationKey(first)), true);
		assert.equal(restoreVisibleControlNotices([
			{ type: "custom", customType: SUBAGENT_CONTROL_MESSAGE_TYPE, data: { source: "async", event: second } },
		], visible), 1);
		assert.equal(visible.has(controlNotificationKey(first)), false);
		assert.equal(visible.has(controlNotificationKey(second)), true);
	});
});
