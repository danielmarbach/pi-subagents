import type { ExtensionAPI, InlineExtension } from "@earendil-works/pi-coding-agent";
import { registerFanoutChildSubagentExtensionWithConfig } from "../../extension/fanout-child.ts";
import { registerSubagentFastModeExtensionWithConfig } from "./fast-mode-extension.ts";
import { registerSubagentPromptRuntimeWithConfig } from "./subagent-prompt-runtime.ts";
import type { ChildRuntimeConfig } from "./child-runtime-config.ts";

export const CHILD_PROMPT_RUNTIME_HOOK = "pi-subagents.child.prompt-runtime";
export const CHILD_FAST_MODE_HOOK = "pi-subagents.child.fast-mode";
export const CHILD_FANOUT_HOOK = "pi-subagents.child.fanout";

/** Build child extension factories from an explicit runtime configuration. */
export function createChildHooks(config: ChildRuntimeConfig): InlineExtension[] {
	const hooks: InlineExtension[] = [
		{
			name: CHILD_PROMPT_RUNTIME_HOOK,
			factory: (pi: ExtensionAPI) => registerSubagentPromptRuntimeWithConfig(pi, config),
		},
	];
	if (config.fastMode === true) {
		hooks.push({
			name: CHILD_FAST_MODE_HOOK,
			factory: (pi: ExtensionAPI) => registerSubagentFastModeExtensionWithConfig(pi, config),
		});
	}
	if (config.child && config.fanoutChild) {
		hooks.push({
			name: CHILD_FANOUT_HOOK,
			factory: (pi: ExtensionAPI) => registerFanoutChildSubagentExtensionWithConfig(pi, config),
		});
	}
	return hooks;
}
