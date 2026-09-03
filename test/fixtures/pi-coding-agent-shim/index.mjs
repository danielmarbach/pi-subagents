import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

export const __piSubagentsTestShim = true;

export function getMarkdownTheme() { return {}; }
export function keyText(keybinding) { return keybinding === "app.tools.expand" ? "configured-expand-key" : ""; }
export function initTheme() {}
export function getLanguageFromPath(filePath) { return path.extname(String(filePath)).slice(1) || undefined; }
export function highlightCode(source) { return String(source).split("\n"); }
export function convertToLlm(value) { return value; }
export function createReadOnlyTools() {
	return ["read", "grep", "find", "ls"].map((name) => ({ name }));
}

const DEFAULT_MAX_LINES = 2000;
const DEFAULT_MAX_BYTES = 50 * 1024;

function splitLinesForCounting(content) {
	if (content.length === 0) return [];
	const lines = content.split("\n");
	if (content.endsWith("\n")) lines.pop();
	return lines;
}

function truncateStringToBytesFromEnd(value, maxBytes) {
	const bytes = Buffer.from(value, "utf-8");
	if (bytes.length <= maxBytes) return value;
	let start = bytes.length - maxBytes;
	while (start < bytes.length && (bytes[start] & 0xc0) === 0x80) start++;
	return bytes.subarray(start).toString("utf-8");
}

function truncate(content, options, fromTail) {
	const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	const lines = splitLinesForCounting(content);
	if (lines.length <= maxLines && Buffer.byteLength(content, "utf-8") <= maxBytes) return content;
	if (!fromTail && Buffer.byteLength(lines[0] ?? "", "utf-8") > maxBytes) return "";
	const output = [];
	let outputBytes = 0;
	for (let index = fromTail ? lines.length - 1 : 0; fromTail ? index >= 0 : index < lines.length; fromTail ? index-- : index++) {
		if (output.length >= maxLines) break;
		const line = lines[index];
		const lineBytes = Buffer.byteLength(line, "utf-8") + (output.length > 0 ? 1 : 0);
		if (outputBytes + lineBytes > maxBytes) {
			if (fromTail && output.length === 0) output.unshift(truncateStringToBytesFromEnd(line, maxBytes));
			break;
		}
		if (fromTail) output.unshift(line);
		else output.push(line);
		outputBytes += lineBytes;
	}
	return output.join("\n");
}

export function truncateHead(content, options = {}) { return { content: truncate(content, options, false) }; }
export function truncateTail(content, options = {}) { return { content: truncate(content, options, true) }; }
export function rawKeyHint(keys, label) { return `${keys} ${label}`; }
export function keyHint(_binding, label) { return label; }

export class DynamicBorder {
	constructor(style = (value) => value) { this.style = style; }
	render(width = 1) { return [this.style("─".repeat(Math.max(1, width)))]; }
	invalidate() {}
}

function writeSession(filePath, header, entries) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, `${[header, ...entries].map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf-8");
}

function readSession(filePath) {
	const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
	const [header, ...entries] = lines;
	return { header, entries };
}

export class SessionManager {
	constructor(cwd, sessionDir, filePath, header, entries = []) {
		this.cwd = cwd;
		this.sessionDir = sessionDir;
		this.filePath = filePath;
		this.header = header;
		this.entries = entries;
	}

	static create(cwd, sessionDir = path.join(cwd, ".pi", "sessions")) {
		const id = randomUUID();
		return new SessionManager(cwd, sessionDir, path.join(sessionDir, `${id}.jsonl`), { type: "session", version: 1, id, timestamp: new Date().toISOString(), cwd });
	}

	static open(filePath, sessionDir = path.dirname(filePath)) {
		const { header, entries } = readSession(filePath);
		return new SessionManager(header.cwd ?? process.cwd(), sessionDir, filePath, header, entries);
	}

	appendMessage(message) {
		const previous = this.entries.at(-1);
		const id = randomUUID().slice(0, 8);
		this.entries.push({ type: "message", id, parentId: previous?.id ?? null, timestamp: new Date().toISOString(), message });
		if (message?.role === "assistant" || fs.existsSync(this.filePath)) writeSession(this.filePath, this.header, this.entries);
	}

	getSessionFile() { return this.filePath; }
	getLeafId() { return this.entries.at(-1)?.id ?? null; }
	getSessionDir() { return this.sessionDir; }
	getHeader() { return this.header; }
	getEntries() { return this.entries; }

	createBranchedSession(leafId) {
		const id = randomUUID();
		const branchFile = path.join(this.sessionDir, `${id}.jsonl`);
		const leafIndex = this.entries.findIndex((entry) => entry.id === leafId);
		const entries = leafIndex >= 0 ? this.entries.slice(0, leafIndex + 1) : [...this.entries];
		writeSession(branchFile, { ...this.header, id, parentSession: this.filePath }, entries);
		return branchFile;
	}
}

export class DefaultResourceLoader {}
export class ModelRuntime {}
export class SettingsManager {}

export function createAgentSession() {
	throw new Error("Real Pi session tests require the real @earendil-works/pi-coding-agent package.");
}
