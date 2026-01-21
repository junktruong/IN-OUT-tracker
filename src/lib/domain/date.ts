export const toYmd = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const monthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const parseMonthKey = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
};

export const addMonths = (key: string, delta: number) => {
  const { year, month } = parseMonthKey(key);
  const date = new Date(year, month - 1 + delta, 1);
  return monthKey(date);
};

export const clampDayInMonth = (year: number, monthIndex: number, day: number) => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(day, 1), daysInMonth);
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const startOfNextMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 1);
