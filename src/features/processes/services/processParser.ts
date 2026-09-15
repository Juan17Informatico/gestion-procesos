import type { Process, ProcessStatus } from '../../../types/app';
import { nowIso } from '../../../utils/dates';
import { createId } from '../../../utils/id';

export interface ParsedProcess {
  process: Process;
  warnings: string[];
  duplicateOf?: Process;
  sourceLine: string;
}

const statusSymbols: Array<{ symbol: string; status: ProcessStatus }> = [
  { symbol: '* - *', status: 'complete' },
  { symbol: '-_-', status: 'validation_only' },
  { symbol: '- _-', status: 'validation_only' },
  { symbol: '-', status: 'pending' },
];

function toIsoDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  return `${match[3]}-${month}-${day}`;
}

function readStatus(line: string): { status: ProcessStatus; symbol?: string; cleaned: string } {
  const normalized = line.replace(/\s+/g, ' ').trim();
  const found = statusSymbols.find((item) => normalized.endsWith(item.symbol));
  if (!found) return { status: 'unknown', cleaned: line.trim() };

  return {
    status: found.status,
    symbol: found.symbol,
    cleaned: normalized.slice(0, -found.symbol.length).trim(),
  };
}

function findDuplicate(process: Process, existing: Process[]): Process | undefined {
  return existing.find((item) => {
    if (process.identification && item.identification === process.identification) return true;
    if (process.phone && item.phone === process.phone && item.name.toLowerCase() === process.name.toLowerCase()) {
      return true;
    }
    return false;
  });
}

export function parseProcessesText(input: string, existing: Process[]): ParsedProcess[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^-{5,}$/.test(line));

  let currentDate = nowIso().slice(0, 10);
  const parsed: ParsedProcess[] = [];

  for (const line of lines) {
    const date = toIsoDate(line);
    if (date) {
      currentDate = date;
      continue;
    }

    const warnings: string[] = [];
    const statusResult = readStatus(line);
    const tokens = statusResult.cleaned.split(/\t+|\s{2,}/).map((token) => token.trim()).filter(Boolean);
    const fallbackTokens = statusResult.cleaned.split(/\s+/).filter(Boolean);
    const numericTokens = fallbackTokens.filter((token) => /^\d{6,}$/.test(token));

    const identification = tokens.find((token) => /^\d{6,12}$/.test(token)) ?? numericTokens[0];
    const phone = tokens.find((token) => /^3\d{9}$/.test(token)) ?? numericTokens.find((token) => /^3\d{9}$/.test(token));
    let name = tokens[0] ?? statusResult.cleaned;

    if (tokens.length <= 1 && numericTokens.length > 0) {
      const firstNumber = statusResult.cleaned.indexOf(numericTokens[0]);
      name = firstNumber > 0 ? statusResult.cleaned.slice(0, firstNumber).trim() : statusResult.cleaned;
    }

    if (!identification) warnings.push('Falta identificacion');
    if (!phone) warnings.push('Falta telefono');
    if (statusResult.status === 'unknown') warnings.push('Estado no reconocido');

    const now = nowIso();
    const process: Process = {
      id: createId('process'),
      date: currentDate,
      name,
      identification,
      phone,
      status: statusResult.status,
      originalStatusSymbol: statusResult.symbol,
      createdAt: now,
      updatedAt: now,
    };

    parsed.push({
      process,
      warnings,
      duplicateOf: findDuplicate(process, existing),
      sourceLine: line,
    });
  }

  return parsed;
}

export function statusToSymbol(status: ProcessStatus): string {
  if (status === 'complete') return '* - *';
  if (status === 'validation_only') return '-_-';
  if (status === 'pending') return '-';
  return '';
}
