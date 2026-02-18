import Anthropic from '@anthropic-ai/sdk';

export async function scoreContribution(diff: string, apiKey: string): Promise<{ score: number; summary: string }> {
  const client = new Anthropic({ apiKey });
  const trimmedDiff = diff.slice(0, 8000);
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Rate this code contribution 0-100 and give a one-line summary. Respond as JSON: {"score": <number>, "summary": "<text>"}\n\n${trimmedDiff}`,
    }],
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  try {
    const parsed = JSON.parse(text);
    return { score: Math.min(100, Math.max(0, parsed.score)), summary: parsed.summary };
  } catch {
    return { score: 50, summary: 'Contribution received' };
  }
}
