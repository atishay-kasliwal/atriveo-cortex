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

2. Commitments
   Promises, TODOs, follow-ups, unfinished work, pending actions.

3. Ideas
   Concepts, designs, architectures, opportunities, or recurring themes.

Rules:

* Ignore application names.
* Ignore navigation activity.
* Ignore repeated audio.
* Ignore generic browsing.
* Focus only on durable work.

EVIDENCE:
${timeline}

Return ONLY valid JSON.

Schema:

{
"projects": [
{
"name": "",
"confidence": 0.0,
"evidence": []
}
],
"commitments": [
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
