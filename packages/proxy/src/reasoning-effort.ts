/**
 * Extract the per-request "reasoning effort" from a parsed request body.
 *
 * Storage representation (single TEXT value, null when absent):
 *   - Anthropic `output_config: { effort: "<string>" }` → the raw effort string
 *     as-is. This is what Claude Code actually sends for Anthropic requests
 *     (low/medium/high/xhigh/max), so it is checked FIRST — without it the
 *     `reasoning_effort` column stayed NULL for every Fable/Opus request.
 *   - Anthropic `thinking: { type: "enabled", budget_tokens: N }` →
 *     `"thinking:<N>"`, or bare `"thinking"` when enabled without a numeric
 *     budget. `type: "disabled"` → null.
 *   - OpenAI Responses `reasoning: { effort: "<string>" }` → the raw effort
 *     string as-is (arbitrary vocabulary: minimal/low/medium/high/xhigh/max/…).
 */
export function parseReasoningEffort(body: unknown): string | null {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return null;
	}
	const record = body as Record<string, unknown>;

	const outputConfig = record.output_config;
	if (typeof outputConfig === "object" && outputConfig !== null) {
		const effort = (outputConfig as Record<string, unknown>).effort;
		if (typeof effort === "string" && effort.length > 0) {
			return effort;
		}
	}

	const thinking = record.thinking;
	if (typeof thinking === "object" && thinking !== null) {
		const t = thinking as Record<string, unknown>;
		if (t.type === "enabled") {
			const budget = t.budget_tokens;
			if (typeof budget === "number" && Number.isFinite(budget)) {
				return `thinking:${budget}`;
			}
			return "thinking";
		}
		return null;
	}

	const reasoning = record.reasoning;
	if (typeof reasoning === "object" && reasoning !== null) {
		const effort = (reasoning as Record<string, unknown>).effort;
		if (typeof effort === "string" && effort.length > 0) {
			return effort;
		}
	}

	return null;
}
