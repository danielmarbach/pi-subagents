import type { BeforeProviderRequestEvent, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readChildRuntimeConfigFromEnv, type ChildRuntimeConfig } from "./child-runtime-config.ts";

export function rewriteFastModeProviderRequest(event: BeforeProviderRequestEvent): unknown {
	if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) return event.payload;
	return { ...event.payload, service_tier: "priority" };
}

export function registerSubagentFastModeExtensionWithConfig(pi: ExtensionAPI, _config: ChildRuntimeConfig): void {
	pi.on("before_provider_request", rewriteFastModeProviderRequest);
}

export default function registerSubagentFastModeExtension(pi: ExtensionAPI): void {
	registerSubagentFastModeExtensionWithConfig(pi, { ...readChildRuntimeConfigFromEnv(process.env), fastMode: true });
}
