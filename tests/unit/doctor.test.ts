import { describe, expect, it } from 'vitest';
import { diagnose } from '../../scripts/doctor.js';

describe('doctor', () => {
  it('distingue requisitos obligatorios y opcionales sin exponer secretos', async () => {
    const report = await diagnose({ env: { OPENAI_API_KEY: 'super-secret' }, commandExists: async (name) => name !== 'uv' });
    expect(report.ok).toBe(true);
    expect(report.checks.find((c) => c.name === 'uv')?.status).toBe('optional-missing');
    expect(JSON.stringify(report)).not.toContain('super-secret');
  });
});
