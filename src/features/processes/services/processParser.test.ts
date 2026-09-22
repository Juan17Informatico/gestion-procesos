import { describe, expect, it } from 'vitest';
import { parseProcessesText } from './processParser';

describe('parseProcessesText', () => {
  it('keeps compatibility with existing status symbols', () => {
    const result = parseProcessesText(
      [
        'PERSONA COMPLETA  1000000000  3000000000 * - *',
        'PERSONA CONVALIDACION  1000000001  3000000001 -_-',
        'PERSONA CONVALIDACION ESPACIADA  1000000002  3000000002 - _-',
        'PERSONA PENDIENTE  1000000003  3000000003 -',
      ].join('\n'),
      [],
    );

    expect(result.map((item) => item.process.status)).toEqual([
      'complete',
      'validation_only',
      'validation_only',
      'pending',
    ]);
    expect(result.every((item) => !item.warnings.includes('Estado no reconocido'))).toBe(true);
  });

  it('supports pasted status words and abbreviations', () => {
    const result = parseProcessesText(
      [
        'PERSONA OK  1000000000  3000000000 ok',
        'PERSONA COMPLETOS  1000000001  3000000001 completos',
        'PERSONA CV  1000000002  3000000002 cv',
        'PERSONA CONVALIDACIONES  1000000003  3000000003 convalidaciones',
        'PERSONA P  1000000004  3000000004 p',
        'PERSONA PENDIENTES  1000000005  3000000005 pendientes',
      ].join('\n'),
      [],
    );

    expect(result.map((item) => item.process.status)).toEqual([
      'complete',
      'complete',
      'validation_only',
      'validation_only',
      'pending',
      'pending',
    ]);
    expect(result.map((item) => item.process.name)).toEqual([
      'PERSONA OK',
      'PERSONA COMPLETOS',
      'PERSONA CV',
      'PERSONA CONVALIDACIONES',
      'PERSONA P',
      'PERSONA PENDIENTES',
    ]);
  });

  it('handles accents, uppercase markers and trailing punctuation', () => {
    const result = parseProcessesText(
      [
        'PERSONA UNO  1000000000  3000000000 OK.',
        'PERSONA DOS  1000000001  3000000001 convalidación',
        'PERSONA TRES  1000000002  3000000002 PENDIENTE',
      ].join('\n'),
      [],
    );

    expect(result.map((item) => item.process.status)).toEqual([
      'complete',
      'validation_only',
      'pending',
    ]);
  });

  it('avoids creating blank records when a line only contains a status marker', () => {
    const result = parseProcessesText(['ok', '-', 'cv', 'PERSONA REAL  1000000000  3000000000 p'].join('\n'), []);

    expect(result).toHaveLength(1);
    expect(result[0].process.name).toBe('PERSONA REAL');
    expect(result[0].process.status).toBe('pending');
  });

  it('recognizes COMPLETO - NO APTO as a valid pasted status', () => {
    const result = parseProcessesText('PERSONA NO APTA  1000000000  3000000000 COMPLETO - NO APTO', []);

    expect(result).toHaveLength(1);
    expect(result[0].process.name).toBe('PERSONA NO APTA');
    expect(result[0].process.status).toBe('COMPLETO - NO APTO');
    expect(result[0].warnings).not.toContain('Estado no reconocido');
  });

  it('maps previous no apto wordings to the current status', () => {
    const result = parseProcessesText(
      [
        'PERSONA LEGADA  1000000000  3000000000 OK completo - NO APTO',
        'PERSONA MIXTA  1000000001  3000000001 Completo - NO APTO',
      ].join('\n'),
      [],
    );

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.process.status)).toEqual(['COMPLETO - NO APTO', 'COMPLETO - NO APTO']);
  });

  it('keeps unknown final words as warnings instead of guessing a status', () => {
    const result = parseProcessesText('PERSONA RARA  1000000000  3000000000 revision', []);

    expect(result).toHaveLength(1);
    expect(result[0].process.status).toBe('unknown');
    expect(result[0].warnings).toContain('Estado no reconocido');
  });
});
