export function buildExtractionPrompt(
  timeline: string,
  hourStart: string,
  hourEnd: string,
): string {
  return `You are an AI Working Memory engine.

Analyze the provided computer activity evidence.

Time window: ${hourStart} to ${hourEnd}

Your goal is NOT to summarize applications or websites.

Your goal is to identify:

1. Projects
   Active efforts the user is spending meaningful time on.

2. Actions
   Concrete things the user is doing, needs to do, or explicitly stated next steps.
   Prefer observable tasks over vague intentions.

3. Ideas
   Concepts, designs, architectures, opportunities, or recurring themes.

Rules:

* Ignore application names.
* Ignore navigation activity.
* Ignore repeated audio.
* Ignore generic browsing.
* Ignore UI chrome labels (e.g. sidebar buttons, menu items).
* Do not quote agent instructions back as actions.
* Focus only on durable work.

EVIDENCE:
${timeline}

Return ONLY valid JSON. No markdown fences. No commentary.

Schema:

{
"projects": [
{
"name": "",
"confidence": 0.0,
"evidence": []
}
],
"actions": [
{
"text": "",
"confidence": 0.0,
"evidence": []
}
],
"ideas": [
{
"text": "",
"confidence": 0.0,
"evidence": []
}
]
}`;
}

export function buildJsonRecoveryPrompt(brokenOutput: string): string {
  return `The following model output was meant to be valid JSON but is incomplete or invalid.

Return ONLY a complete valid JSON object matching this schema. No markdown fences. No commentary.

Schema:
{
"projects": [{"name": "", "confidence": 0.0, "evidence": []}],
"actions": [{"text": "", "confidence": 0.0, "evidence": []}],
"ideas": [{"text": "", "confidence": 0.0, "evidence": []}]
}

Broken output:
${brokenOutput.slice(0, 12_000)}`;
}
