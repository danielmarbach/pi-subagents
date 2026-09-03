import {
	SUBAGENT_CHILD_AGENT_ENV,
	SUBAGENT_CHILD_ENV,
	SUBAGENT_CHILD_INDEX_ENV,
	SUBAGENT_FANOUT_CHILD_ENV,
	SUBAGENT_FORK_CACHE_KEY_ENV,
	SUBAGENT_ORCHESTRATOR_SESSION_ID_ENV,
	SUBAGENT_ORCHESTRATOR_TARGET_ENV,
	SUBAGENT_PARENT_CAPABILITY_TOKEN_ENV,
	SUBAGENT_PARENT_CHILD_INDEX_ENV,
	SUBAGENT_PARENT_CONTROL_INBOX_ENV,
	SUBAGENT_PARENT_DEPTH_ENV,
	SUBAGENT_PARENT_EVENT_SINK_ENV,
	SUBAGENT_PARENT_PATH_ENV,
	SUBAGENT_PARENT_ROOT_RUN_ID_ENV,
	SUBAGENT_PARENT_RUN_ID_ENV,
	SUBAGENT_PARENT_SESSION_ENV,
	SUBAGENT_RUN_ID_ENV,
	SUBAGENT_STEER_ACK_DIR_ENV,
	SUBAGENT_STEER_CAPABILITY_ENV,
	SUBAGENT_STEER_INBOX_ENV,
	SUBAGENT_SUPERVISOR_CHANNEL_DIR_ENV,
} from "./pi-args.ts";
import { decodeSubagentCapabilityCeiling, SUBAGENT_CAPABILITY_CEILING_ENV, type ResolvedSubagentCapabilityCeiling } from "./capability-ceiling.ts";
import { parseNestedPathEnv, type NestedPathEntry } from "./nested-path.ts";
import { decodePermissionRules, PERMISSION_AUDIT_PATH_ENV, PERMISSION_POLICY_ENV, type PermissionRules } from "./permissions.ts";
import { decodeRunFanoutBudgetDescriptor, RUN_FANOUT_BUDGET_ENV } from "./run-fanout-budget.ts";
import { RUNTIME_EXTENSION_ACK_PATH_ENV } from "./runtime-acknowledged-extensions.ts";
import { decodeThinkingCeiling, SUBAGENT_THINKING_CEILING_ENV, type ThinkingLevel } from "../../shared/thinking-ceiling.ts";
import { DEFAULT_MAX_SUBAGENT_SPAWNS_PER_RUN, DEFAULT_SUBAGENT_MAX_DEPTH, normalizeMaxSubagentDepth, normalizeMaxSubagentSpawnsPerRun, normalizeMaxSubagentSpawnsPerSession, type ResolvedToolBudget, type RunFanoutBudgetDescriptor } from "../../shared/types.ts";
import { decodeChildWatchdogConfig, CHILD_WATCHDOG_CONFIG_ENV, type ChildWatchdogConfig } from "../../watchdog/child-status.ts";
import { resolveWaitToolConfig, WAIT_TOOL_DEFAULT_TIMEOUT_MS_ENV, WAIT_TOOL_ENABLED_ENV, type ResolvedWaitToolConfig } from "../background/wait-config.ts";
import { decodeToolBudgetEnv, TOOL_BUDGET_ENV, TOOL_BUDGET_ZERO_AUTH_ENV } from "./tool-budget.ts";
import { CHILD_TOOL_DIAGNOSTIC_PATH_ENV, MCP_DIRECT_CHILD_TOOLS_ENV, REQUIRED_CHILD_TOOLS_ENV } from "./tool-availability.ts";
import { STRUCTURED_OUTPUT_ACCEPTANCE_CAPTURE_ENV, STRUCTURED_OUTPUT_ACCEPTANCE_REQUIRED_ENV, STRUCTURED_OUTPUT_CAPTURE_ENV, STRUCTURED_OUTPUT_SCHEMA_ENV } from "./structured-output.ts";

/** Child environment names without shared constants. */
export const SUBAGENT_INHERIT_PROJECT_CONTEXT_ENV = "PI_SUBAGENT_INHERIT_PROJECT_CONTEXT";
export const SUBAGENT_INHERIT_GLOBAL_CONTEXT_ENV = "PI_SUBAGENT_INHERIT_GLOBAL_CONTEXT";
export const SUBAGENT_INHERIT_SKILLS_ENV = "PI_SUBAGENT_INHERIT_SKILLS";
export const SUBAGENT_INTERCOM_SESSION_NAME_ENV = "PI_SUBAGENT_INTERCOM_SESSION_NAME";
export const SUBAGENT_SESSION_NAME_ENV = "PI_SUBAGENT_SESSION_NAME";
export const SUBAGENT_DEPTH_ENV = "PI_SUBAGENT_DEPTH";
export const SUBAGENT_MAX_DEPTH_ENV = "PI_SUBAGENT_MAX_DEPTH";
export const SUBAGENT_MAX_SPAWNS_PER_SESSION_ENV = "PI_SUBAGENT_MAX_SPAWNS_PER_SESSION";
export const SUBAGENT_MAX_SPAWNS_PER_RUN_ENV = "PI_SUBAGENT_MAX_SPAWNS_PER_RUN";
export const SUBAGENT_TOOL_TIMEOUT_ENV = "PI_SUBAGENT_TOOL_TIMEOUT_MS";
export const SUBAGENT_FS_RETRY_MAX_TOTAL_MS_ENV = "PI_SUBAGENT_FS_RETRY_MAX_TOTAL_MS";
export const SUBAGENT_PI_BINARY_ENV = "PI_SUBAGENT_PI_BINARY";
export const SUBAGENT_EXTRA_AGENT_DIRS_ENV = "PI_SUBAGENT_EXTRA_AGENT_DIRS";
export const SUBAGENT_ASYNC_EVENTS_MAX_BYTES_ENV = "PI_SUBAGENT_ASYNC_EVENTS_MAX_BYTES";

export interface ChildSupervisorConfig {
	channelDir: string;
	runId: string;
	agent: string;
	childIndex: number;
	orchestratorTarget?: string;
	orchestratorSessionId: string;
	childTarget?: string;
}

export interface ChildNestedRouteConfig {
	rootRunId: string;
	eventSink: string;
	controlInbox: string;
	capabilityToken: string;
}

export interface ChildRuntimeConfig {
	/** True only for a process launched as a pi-subagents child. */
	child: boolean;
	/** True only when this child is authorized to register the fanout tool. */
	fanoutChild: boolean;
	/** Prompt-boundary compatibility for the historical non-strict boolean decoder. */
	fanoutPromptBoundary: boolean | undefined;
	/** Set by an inline-session caller; it is not represented by an environment variable. */
	fastMode?: boolean;

	// Identity and routing.
	orchestratorTarget?: string;
	orchestratorSessionId?: string;
	runId?: string;
	childAgent?: string;
	childIndex?: number;
	intercomSessionName?: string;
	sessionName?: string;
	supervisor?: ChildSupervisorConfig;

	// Inherited parent/nested routing.
	parentEventSink?: string;
	parentControlInbox?: string;
	parentRootRunId?: string;
	parentRunId?: string;
	parentChildIndex?: number;
	parentDepth?: number;
	parentPath: NestedPathEntry[];
	parentCapabilityToken?: string;
	parentSession?: string;
	nestedRoute?: ChildNestedRouteConfig;

	// Context and child hooks.
	inheritProjectContext?: boolean;
	inheritGlobalContext?: boolean;
	inheritSkills?: boolean;
	forkCacheKey?: string;
	steerInbox?: string;
	steerCapabilityPath?: string;
	steerAckDir?: string;
	runtimeAcknowledgementPath?: string;
	permissionRules?: PermissionRules;
	permissionAuditPath?: string;
	childWatchdog?: ChildWatchdogConfig;
	childWatchdogRaw?: string;
	toolBudget?: ResolvedToolBudget;
	allowZeroToolBudget: boolean;
	waitTool: ResolvedWaitToolConfig;
	waitToolEnabledEnv?: string;
	waitToolDefaultTimeoutMsEnv?: string;
	requiredChildTools?: string[];
	mcpDirectChildTools?: string[];
	childToolDiagnosticPath?: string;
	structuredOutputCapturePath?: string;
	structuredOutputSchemaPath?: string;
	structuredOutputAcceptanceCapturePath?: string;
	structuredOutputAcceptanceRequired: boolean;

	// Limits inherited by nested children.
	capabilityCeiling?: ResolvedSubagentCapabilityCeiling;
	thinkingCeiling?: ThinkingLevel;
	runFanoutBudget?: RunFanoutBudgetDescriptor;
	depth: number;
	maxDepth: number;
	maxSpawnsPerSession?: number;
	maxSpawnsPerRun: number;
	toolTimeoutMs?: string;
	fsRetryMaxTotalMs?: number;

	// Values retained for nested launch compatibility.
	piBinary?: string;
	extraAgentDirs?: string;
	asyncEventsMaxBytes?: string;
}

function readText(env: NodeJS.ProcessEnv, name: string): string | undefined {
	const value = env[name]?.trim();
	return value ? value : undefined;
}

function readBoolean(env: NodeJS.ProcessEnv, name: string): boolean | undefined {
	const value = env[name];
	if (value === undefined) return undefined;
	return value !== "0";
}

function readNonNegativeIndex(env: NodeJS.ProcessEnv, name: string): number | undefined {
	const value = readText(env, name);
	return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;
}

function readFiniteNumber(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
	const value = Number(env[name] ?? String(fallback));
	return Number.isFinite(value) ? value : Number.NaN;
}

function readRequiredChildTools(env: NodeJS.ProcessEnv): string[] | undefined {
	const encoded = env[REQUIRED_CHILD_TOOLS_ENV]?.trim();
	if (!encoded) return undefined;
	const required = JSON.parse(encoded) as unknown;
	if (!Array.isArray(required) || required.some((name) => typeof name !== "string" || !name)) {
		throw new Error(`Invalid ${REQUIRED_CHILD_TOOLS_ENV} payload.`);
	}
	return required;
}

function readMcpDirectChildTools(env: NodeJS.ProcessEnv): string[] | undefined {
	const encoded = env[MCP_DIRECT_CHILD_TOOLS_ENV]?.trim();
	if (!encoded) return undefined;
	try {
		const tools = JSON.parse(encoded) as unknown;
		if (!Array.isArray(tools) || tools.some((name) => typeof name !== "string" || !name)) return undefined;
		return tools;
	} catch {
		return undefined;
	}
}

function readSupervisor(env: NodeJS.ProcessEnv): ChildSupervisorConfig | undefined {
	const channelDir = readText(env, SUBAGENT_SUPERVISOR_CHANNEL_DIR_ENV);
	const runId = readText(env, SUBAGENT_RUN_ID_ENV);
	const agent = readText(env, SUBAGENT_CHILD_AGENT_ENV);
	const orchestratorSessionId = readText(env, SUBAGENT_ORCHESTRATOR_SESSION_ID_ENV);
	const childIndex = readNonNegativeIndex(env, SUBAGENT_CHILD_INDEX_ENV);
	if (!channelDir || !runId || !agent || !orchestratorSessionId || childIndex === undefined) return undefined;
	return {
		channelDir,
		runId,
		agent,
		childIndex,
		orchestratorTarget: readText(env, SUBAGENT_ORCHESTRATOR_TARGET_ENV),
		orchestratorSessionId,
		childTarget: readText(env, SUBAGENT_INTERCOM_SESSION_NAME_ENV),
	};
}

function readNestedRoute(env: NodeJS.ProcessEnv): ChildNestedRouteConfig | undefined {
	const rootRunId = readText(env, SUBAGENT_PARENT_ROOT_RUN_ID_ENV);
	const eventSink = readText(env, SUBAGENT_PARENT_EVENT_SINK_ENV);
	const controlInbox = readText(env, SUBAGENT_PARENT_CONTROL_INBOX_ENV);
	const capabilityToken = readText(env, SUBAGENT_PARENT_CAPABILITY_TOKEN_ENV);
	return rootRunId && eventSink && controlInbox && capabilityToken
		? { rootRunId, eventSink, controlInbox, capabilityToken }
		: undefined;
}

function readFsRetryMaxTotalMs(env: NodeJS.ProcessEnv): number | undefined {
	const raw = env[SUBAGENT_FS_RETRY_MAX_TOTAL_MS_ENV];
	if (raw === undefined || raw.trim() === "") return undefined;
	const value = Number(raw);
	if (!Number.isInteger(value) || value < 0) {
		throw new Error(`${SUBAGENT_FS_RETRY_MAX_TOTAL_MS_ENV} must be a non-negative integer number of milliseconds.`);
	}
	return value;
}

/**
 * Decode the child process contract once. The returned object is deliberately
 * free of process.env access so the same hook factories can be hosted by an
 * in-process AgentSession later.
 */
export function readChildRuntimeConfigFromEnv(env: NodeJS.ProcessEnv): ChildRuntimeConfig {
	const child = env[SUBAGENT_CHILD_ENV] === "1";
	const fanoutChild = env[SUBAGENT_FANOUT_CHILD_ENV] === "1";
	const capabilityCeiling = fanoutChild ? decodeSubagentCapabilityCeiling(env[SUBAGENT_CAPABILITY_CEILING_ENV]) : undefined;
	const thinkingCeiling = fanoutChild ? decodeThinkingCeiling(env[SUBAGENT_THINKING_CEILING_ENV]) : undefined;
	const runFanoutBudget = fanoutChild ? decodeRunFanoutBudgetDescriptor(env[RUN_FANOUT_BUDGET_ENV]) : undefined;
	const maxDepth = normalizeMaxSubagentDepth(env[SUBAGENT_MAX_DEPTH_ENV]) ?? DEFAULT_SUBAGENT_MAX_DEPTH;
	return {
		child,
		fanoutChild,
		fanoutPromptBoundary: readBoolean(env, SUBAGENT_FANOUT_CHILD_ENV),
		orchestratorTarget: readText(env, SUBAGENT_ORCHESTRATOR_TARGET_ENV),
		orchestratorSessionId: readText(env, SUBAGENT_ORCHESTRATOR_SESSION_ID_ENV),
		runId: readText(env, SUBAGENT_RUN_ID_ENV),
		childAgent: readText(env, SUBAGENT_CHILD_AGENT_ENV),
		childIndex: readNonNegativeIndex(env, SUBAGENT_CHILD_INDEX_ENV),
		intercomSessionName: readText(env, SUBAGENT_INTERCOM_SESSION_NAME_ENV),
		sessionName: readText(env, SUBAGENT_SESSION_NAME_ENV),
		supervisor: readSupervisor(env),
		parentEventSink: readText(env, SUBAGENT_PARENT_EVENT_SINK_ENV),
		parentControlInbox: readText(env, SUBAGENT_PARENT_CONTROL_INBOX_ENV),
		parentRootRunId: readText(env, SUBAGENT_PARENT_ROOT_RUN_ID_ENV),
		parentRunId: readText(env, SUBAGENT_PARENT_RUN_ID_ENV),
		parentChildIndex: readNonNegativeIndex(env, SUBAGENT_PARENT_CHILD_INDEX_ENV),
		parentDepth: readFiniteNumber(env, SUBAGENT_PARENT_DEPTH_ENV, 0),
		parentPath: parseNestedPathEnv(env[SUBAGENT_PARENT_PATH_ENV]),
		parentCapabilityToken: readText(env, SUBAGENT_PARENT_CAPABILITY_TOKEN_ENV),
		parentSession: readText(env, SUBAGENT_PARENT_SESSION_ENV),
		nestedRoute: readNestedRoute(env),
		inheritProjectContext: readBoolean(env, SUBAGENT_INHERIT_PROJECT_CONTEXT_ENV),
		inheritGlobalContext: readBoolean(env, SUBAGENT_INHERIT_GLOBAL_CONTEXT_ENV),
		inheritSkills: readBoolean(env, SUBAGENT_INHERIT_SKILLS_ENV),
		forkCacheKey: readText(env, SUBAGENT_FORK_CACHE_KEY_ENV),
		steerInbox: readText(env, SUBAGENT_STEER_INBOX_ENV),
		steerCapabilityPath: readText(env, SUBAGENT_STEER_CAPABILITY_ENV),
		steerAckDir: readText(env, SUBAGENT_STEER_ACK_DIR_ENV),
		runtimeAcknowledgementPath: readText(env, RUNTIME_EXTENSION_ACK_PATH_ENV),
		permissionRules: decodePermissionRules(env[PERMISSION_POLICY_ENV]),
		permissionAuditPath: env[PERMISSION_AUDIT_PATH_ENV],
		childWatchdog: decodeChildWatchdogConfig(env[CHILD_WATCHDOG_CONFIG_ENV]),
		childWatchdogRaw: env[CHILD_WATCHDOG_CONFIG_ENV],
		toolBudget: decodeToolBudgetEnv(env[TOOL_BUDGET_ENV], { allowZero: env[TOOL_BUDGET_ZERO_AUTH_ENV] === "1" }),
		allowZeroToolBudget: env[TOOL_BUDGET_ZERO_AUTH_ENV] === "1",
		waitTool: resolveWaitToolConfig(undefined, env),
		waitToolEnabledEnv: env[WAIT_TOOL_ENABLED_ENV],
		waitToolDefaultTimeoutMsEnv: env[WAIT_TOOL_DEFAULT_TIMEOUT_MS_ENV],
		requiredChildTools: readRequiredChildTools(env),
		mcpDirectChildTools: readMcpDirectChildTools(env),
		childToolDiagnosticPath: readText(env, CHILD_TOOL_DIAGNOSTIC_PATH_ENV),
		structuredOutputCapturePath: env[STRUCTURED_OUTPUT_CAPTURE_ENV],
		structuredOutputSchemaPath: env[STRUCTURED_OUTPUT_SCHEMA_ENV],
		structuredOutputAcceptanceCapturePath: env[STRUCTURED_OUTPUT_ACCEPTANCE_CAPTURE_ENV],
		structuredOutputAcceptanceRequired: env[STRUCTURED_OUTPUT_ACCEPTANCE_REQUIRED_ENV] === "1",
		capabilityCeiling,
		thinkingCeiling,
		runFanoutBudget,
		depth: readFiniteNumber(env, SUBAGENT_DEPTH_ENV, 0),
		maxDepth,
		maxSpawnsPerSession: normalizeMaxSubagentSpawnsPerSession(env[SUBAGENT_MAX_SPAWNS_PER_SESSION_ENV]),
		maxSpawnsPerRun: normalizeMaxSubagentSpawnsPerRun(env[SUBAGENT_MAX_SPAWNS_PER_RUN_ENV]) ?? DEFAULT_MAX_SUBAGENT_SPAWNS_PER_RUN,
		toolTimeoutMs: env[SUBAGENT_TOOL_TIMEOUT_ENV],
		fsRetryMaxTotalMs: readFsRetryMaxTotalMs(env),
		piBinary: readText(env, SUBAGENT_PI_BINARY_ENV),
		extraAgentDirs: env[SUBAGENT_EXTRA_AGENT_DIRS_ENV],
		asyncEventsMaxBytes: env[SUBAGENT_ASYNC_EVENTS_MAX_BYTES_ENV],
	};
}
