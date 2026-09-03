import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHILD_FANOUT_HOOK, CHILD_FAST_MODE_HOOK, CHILD_PROMPT_RUNTIME_HOOK, createChildHooks } from "../../src/runs/shared/child-hooks.ts";
import {
	readChildRuntimeConfigFromEnv,
	SUBAGENT_INHERIT_GLOBAL_CONTEXT_ENV,
	SUBAGENT_INHERIT_PROJECT_CONTEXT_ENV,
	SUBAGENT_INHERIT_SKILLS_ENV,
	SUBAGENT_INTERCOM_SESSION_NAME_ENV,
	SUBAGENT_SESSION_NAME_ENV,
} from "../../src/runs/shared/child-runtime-config.ts";
import { PERMISSION_AUDIT_PATH_ENV, PERMISSION_POLICY_ENV } from "../../src/runs/shared/permissions.ts";
import { STRUCTURED_OUTPUT_ACCEPTANCE_CAPTURE_ENV, STRUCTURED_OUTPUT_ACCEPTANCE_REQUIRED_ENV, STRUCTURED_OUTPUT_CAPTURE_ENV, STRUCTURED_OUTPUT_SCHEMA_ENV } from "../../src/runs/shared/structured-output.ts";
import { TOOL_BUDGET_ENV, TOOL_BUDGET_ZERO_AUTH_ENV } from "../../src/runs/shared/tool-budget.ts";
import { CHILD_TOOL_DIAGNOSTIC_PATH_ENV, MCP_DIRECT_CHILD_TOOLS_ENV, REQUIRED_CHILD_TOOLS_ENV } from "../../src/runs/shared/tool-availability.ts";
import { WAIT_TOOL_DEFAULT_TIMEOUT_MS_ENV, WAIT_TOOL_ENABLED_ENV } from "../../src/runs/background/wait-config.ts";
import { CHILD_WATCHDOG_CONFIG_ENV } from "../../src/watchdog/child-status.ts";
import {
	SUBAGENT_CHILD_AGENT_ENV,
	SUBAGENT_CHILD_ENV,
	SUBAGENT_CHILD_INDEX_ENV,
	SUBAGENT_FANOUT_CHILD_ENV,
	SUBAGENT_FORK_CACHE_KEY_ENV,
	SUBAGENT_ORCHESTRATOR_SESSION_ID_ENV,
	SUBAGENT_ORCHESTRATOR_TARGET_ENV,
	SUBAGENT_PARENT_CAPABILITY_TOKEN_ENV,
	SUBAGENT_PARENT_CONTROL_INBOX_ENV,
	SUBAGENT_PARENT_EVENT_SINK_ENV,
	SUBAGENT_PARENT_ROOT_RUN_ID_ENV,
	SUBAGENT_RUN_ID_ENV,
	SUBAGENT_STEER_ACK_DIR_ENV,
	SUBAGENT_STEER_CAPABILITY_ENV,
	SUBAGENT_STEER_INBOX_ENV,
	SUBAGENT_SUPERVISOR_CHANNEL_DIR_ENV,
} from "../../src/runs/shared/pi-args.ts";

const CHILD_WATCHDOG = JSON.stringify({
	runId: "run-123",
	agent: "worker",
	childIndex: 2,
	watchdogTailTimeoutMs: 1_000,
	agentEndTimeoutMs: 2_000,
	maxWarnings: 3,
	lsp: { enabled: false, timeoutMs: 1_000, maxFiles: 10, maxDiagnostics: 10 },
	stalemateRepeats: 2,
	cadence: { everyNTools: null },
});

describe("child runtime config", () => {
	it("decodes child identity, routing, hook contracts, and limits from the supplied environment", () => {
		const config = readChildRuntimeConfigFromEnv({
			[SUBAGENT_CHILD_ENV]: "1",
			[SUBAGENT_FANOUT_CHILD_ENV]: "1",
			[SUBAGENT_ORCHESTRATOR_TARGET_ENV]: "parent-session",
			[SUBAGENT_ORCHESTRATOR_SESSION_ID_ENV]: "session-parent",
			[SUBAGENT_SUPERVISOR_CHANNEL_DIR_ENV]: "/tmp/supervisor",
			[SUBAGENT_RUN_ID_ENV]: "run-123",
			[SUBAGENT_CHILD_AGENT_ENV]: "worker",
			[SUBAGENT_CHILD_INDEX_ENV]: "2",
			[SUBAGENT_INTERCOM_SESSION_NAME_ENV]: "worker-session",
			[SUBAGENT_SESSION_NAME_ENV]: "Worker task",
			[SUBAGENT_PARENT_ROOT_RUN_ID_ENV]: "root-123",
			[SUBAGENT_PARENT_EVENT_SINK_ENV]: "/tmp/nested/events",
			[SUBAGENT_PARENT_CONTROL_INBOX_ENV]: "/tmp/nested/controls",
			[SUBAGENT_PARENT_CAPABILITY_TOKEN_ENV]: "cap-123",
			[SUBAGENT_STEER_INBOX_ENV]: "/tmp/steer",
			[SUBAGENT_STEER_CAPABILITY_ENV]: "/tmp/steer/capability.json",
			[SUBAGENT_STEER_ACK_DIR_ENV]: "/tmp/steer/acks",
			[SUBAGENT_INHERIT_PROJECT_CONTEXT_ENV]: "0",
			[SUBAGENT_INHERIT_GLOBAL_CONTEXT_ENV]: "1",
			[SUBAGENT_INHERIT_SKILLS_ENV]: "0",
			[SUBAGENT_FORK_CACHE_KEY_ENV]: "pi-fork:run-123",
			[REQUIRED_CHILD_TOOLS_ENV]: JSON.stringify(["read", "write"]),
			[MCP_DIRECT_CHILD_TOOLS_ENV]: JSON.stringify(["mcp__repo__search"]),
			[CHILD_TOOL_DIAGNOSTIC_PATH_ENV]: "/tmp/diagnostic.json",
			[PERMISSION_POLICY_ENV]: JSON.stringify({ write: "deny", read: "ask" }),
			[PERMISSION_AUDIT_PATH_ENV]: "/tmp/permission-audit.jsonl",
			[CHILD_WATCHDOG_CONFIG_ENV]: CHILD_WATCHDOG,
			[TOOL_BUDGET_ENV]: JSON.stringify({ hard: 4, soft: 2, block: ["write"] }),
			[TOOL_BUDGET_ZERO_AUTH_ENV]: "1",
			[WAIT_TOOL_ENABLED_ENV]: "false",
			[WAIT_TOOL_DEFAULT_TIMEOUT_MS_ENV]: "4500",
			[STRUCTURED_OUTPUT_CAPTURE_ENV]: "/tmp/output.json",
			[STRUCTURED_OUTPUT_SCHEMA_ENV]: "/tmp/schema.json",
			[STRUCTURED_OUTPUT_ACCEPTANCE_CAPTURE_ENV]: "/tmp/acceptance.json",
			[STRUCTURED_OUTPUT_ACCEPTANCE_REQUIRED_ENV]: "1",
			PI_SUBAGENT_DEPTH: "2",
			PI_SUBAGENT_MAX_DEPTH: "3",
			PI_SUBAGENT_MAX_SPAWNS_PER_SESSION: "5",
			PI_SUBAGENT_MAX_SPAWNS_PER_RUN: "12",
			PI_SUBAGENT_TOOL_TIMEOUT_MS: "2500",
		});

		assert.equal(config.child, true);
		assert.equal(config.fanoutChild, true);
		assert.equal(config.fanoutPromptBoundary, true);
		assert.deepEqual(config.supervisor, {
			channelDir: "/tmp/supervisor",
			runId: "run-123",
			agent: "worker",
			childIndex: 2,
			orchestratorTarget: "parent-session",
			orchestratorSessionId: "session-parent",
			childTarget: "worker-session",
		});
		assert.deepEqual(config.nestedRoute, {
			rootRunId: "root-123",
			eventSink: "/tmp/nested/events",
			controlInbox: "/tmp/nested/controls",
			capabilityToken: "cap-123",
		});
		assert.deepEqual(config.parentPath, []);
		assert.deepEqual(config.requiredChildTools, ["read", "write"]);
		assert.deepEqual(config.mcpDirectChildTools, ["mcp__repo__search"]);
		assert.deepEqual(config.permissionRules, { write: "deny", read: "ask" });
		assert.equal(config.childWatchdog?.agentEndTimeoutMs, 2_000);
		assert.deepEqual(config.toolBudget, { hard: 4, soft: 2, block: ["write"] });
		assert.deepEqual(config.waitTool, { enabled: false, defaultTimeoutMs: 4_500 });
		assert.equal(config.structuredOutputCapturePath, "/tmp/output.json");
		assert.equal(config.structuredOutputAcceptanceRequired, true);
		assert.equal(config.depth, 2);
		assert.equal(config.maxDepth, 3);
		assert.equal(config.maxSpawnsPerSession, 5);
		assert.equal(config.maxSpawnsPerRun, 12);
		assert.equal(config.toolTimeoutMs, "2500");
	});

	it("does not consult the ambient process environment", () => {
		const previous = process.env[SUBAGENT_CHILD_ENV];
		process.env[SUBAGENT_CHILD_ENV] = "1";
		try {
			assert.equal(readChildRuntimeConfigFromEnv({}).child, false);
		} finally {
			if (previous === undefined) delete process.env[SUBAGENT_CHILD_ENV];
			else process.env[SUBAGENT_CHILD_ENV] = previous;
		}
	});

	it("returns only the hooks enabled by the typed config", () => {
		const config = readChildRuntimeConfigFromEnv({});
		assert.deepEqual(createChildHooks(config).map((hook) => typeof hook === "function" ? "function" : hook.name), [CHILD_PROMPT_RUNTIME_HOOK]);
		assert.deepEqual(createChildHooks({ ...config, fastMode: true, child: true, fanoutChild: true }).map((hook) => typeof hook === "function" ? "function" : hook.name), [CHILD_PROMPT_RUNTIME_HOOK, CHILD_FAST_MODE_HOOK, CHILD_FANOUT_HOOK]);
	});
});
