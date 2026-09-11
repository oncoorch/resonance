import OpenAI from 'openai';
import { z } from 'zod';

const resultSchema = z.object({
  status: z.literal('identified'), title: z.string(), artist: z.string(), album: z.string().nullable(),
  year: z.number().int().nullable(), confidence: z.number().min(0).max(100), sources: z.array(z.string()),
});
const jsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    status: { const: 'identified' }, title: { type: 'string' }, artist: { type: 'string' },
    album: { type: ['string', 'null'] }, year: { type: ['integer', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 100 }, sources: { type: 'array', items: { type: 'string' } },
  }, required: ['status', 'title', 'artist', 'album', 'year', 'confidence', 'sources'],
};

export async function identifyWithOpenAI(input: Record<string, unknown>, options: { apiKey?: string; model?: string; client?: Pick<OpenAI, 'responses'> }) {
  if (!options.apiKey && !options.client) return { status: 'unavailable' as const, reason: 'OPENAI_NOT_CONFIGURED' as const };
  const client = options.client ?? new OpenAI({ apiKey: options.apiKey, timeout: 15_000, maxRetries: 1 });
  const model = options.model ?? process.env.OPENAI_MODEL;
  if (!model) return { status: 'unavailable' as const, reason: 'OPENAI_MODEL_NOT_CONFIGURED' as const };
  try {
    const response = await client.responses.create({
      model, store: false, input: `Identify conservatively from this metadata only. Return unknown rather than guessing: ${JSON.stringify(input)}`,
      text: { format: { type: 'json_schema', name: 'track_identification', strict: true, schema: jsonSchema } },
    });
    if (response.output_text.length > 100_000) throw new Error('Respuesta OpenAI demasiado grande');
    return resultSchema.parse(JSON.parse(response.output_text));
  } catch (error) {
    return { status: 'failed' as const, reason: error instanceof Error ? error.message : 'OPENAI_ERROR' };
  }
}
