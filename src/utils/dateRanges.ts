import type { Process } from '../types/app';

export interface DateRange {
  from: string;
  to: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const WEEK_PATTERN = /^(\d{4})-W(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toUtcIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && toLocalIsoDate(date) === value;
}

export function normalizeDateRange(from: string, to: string): DateRange | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return null;
  return from <= to ? { from, to } : { from: to, to: from };
}

export function isDateInRange(date: string, range: DateRange): boolean {
  return isIsoDate(date) && date >= range.from && date <= range.to;
}

export function getMonthRange(monthValue: string): DateRange | null {
  const match = monthValue.match(MONTH_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

export function getMonthSpanRange(fromMonth: string, toMonth: string): DateRange | null {
  const from = getMonthRange(fromMonth);
  const to = getMonthRange(toMonth);
  if (!from || !to) return null;
  return from.from <= to.from ? { from: from.from, to: to.to } : { from: to.from, to: from.to };
}

export function getIsoWeekRange(weekValue: string): DateRange | null {
  const match = weekValue.match(WEEK_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  const fourthOfJanuary = new Date(Date.UTC(year, 0, 4));
  const day = fourthOfJanuary.getUTCDay() || 7;
  const firstIsoMonday = new Date(fourthOfJanuary);
  firstIsoMonday.setUTCDate(fourthOfJanuary.getUTCDate() - day + 1);

  const weekStart = new Date(firstIsoMonday);
  weekStart.setUTCDate(firstIsoMonday.getUTCDate() + (week - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    from: toUtcIsoDate(weekStart),
    to: toUtcIsoDate(weekEnd),
  };
}

export function getWeekSpanRange(fromWeek: string, toWeek: string): DateRange | null {
  const from = getIsoWeekRange(fromWeek);
  const to = getIsoWeekRange(toWeek);
  if (!from || !to) return null;
  return from.from <= to.from ? { from: from.from, to: to.to } : { from: to.from, to: from.to };
}

export function getDateMonthsAgo(months: number, base = new Date()): string {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  date.setMonth(date.getMonth() - months);
  return toLocalIsoDate(date);
}

export function getProcessesInRange(processes: Process[], range: DateRange): Process[] {
  return processes.filter((process) => isDateInRange(process.date, range));
}

export function getProcessesOlderThanMonths(processes: Process[], months: number, base = new Date()): Process[] {
  const cutoff = getDateMonthsAgo(months, base);
  return processes.filter((process) => isIsoDate(process.date) && process.date < cutoff);
}
