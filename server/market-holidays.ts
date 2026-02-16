function getNthWeekday(year: number, month: number, weekday: number, n: number): Date {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month, d);
    if (dt.getMonth() !== month) break;
    if (dt.getDay() === weekday) {
      count++;
      if (count === n) return dt;
    }
  }
  return new Date(year, month, 1);
}

function getLastWeekday(year: number, month: number, weekday: number): Date {
  let last = new Date(year, month, 1);
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month, d);
    if (dt.getMonth() !== month) break;
    if (dt.getDay() === weekday) last = dt;
  }
  return last;
}

export function getUSMarketHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  holidays.push(new Date(year, 0, 1));

  holidays.push(getNthWeekday(year, 0, 1, 3));

  holidays.push(getNthWeekday(year, 1, 1, 3));

  const easter = computeEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  holidays.push(goodFriday);

  holidays.push(getLastWeekday(year, 4, 1));

  holidays.push(new Date(year, 5, 19));

  holidays.push(new Date(year, 6, 4));

  holidays.push(getNthWeekday(year, 8, 1, 1));

  holidays.push(getNthWeekday(year, 10, 3, 4));

  holidays.push(new Date(year, 11, 25));

  return holidays.map(h => {
    const day = h.getDay();
    if (day === 0) {
      return new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1);
    }
    if (day === 6) {
      return new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
    }
    return h;
  });
}

function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

export function isMarketHoliday(date: Date): boolean {
  const holidays = getUSMarketHolidays(date.getFullYear());
  return holidays.some(h =>
    h.getFullYear() === date.getFullYear() &&
    h.getMonth() === date.getMonth() &&
    h.getDate() === date.getDate()
  );
}

export function isTradingDay(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !isMarketHoliday(date);
}

export function getNextTradingDay(from: Date): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  while (!isTradingDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function getMarketCloseUTC(year: number, month: number, day: number): Date {
  let date = new Date(year, month, day);
  while (!isTradingDay(date)) {
    date.setDate(date.getDate() + 1);
  }
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  let sc = 0, ds = new Date(Date.UTC(y, 2, 1));
  for (let i = 1; i <= 31; i++) {
    if (new Date(Date.UTC(y, 2, i)).getUTCDay() === 0) { sc++; if (sc === 2) { ds = new Date(Date.UTC(y, 2, i)); break; } }
  }
  let de = new Date(Date.UTC(y, 10, 1));
  for (let i = 1; i <= 30; i++) {
    if (new Date(Date.UTC(y, 10, i)).getUTCDay() === 0) { de = new Date(Date.UTC(y, 10, i)); break; }
  }
  const targetUTC = new Date(Date.UTC(y, m, d));
  const isDST = targetUTC >= ds && targetUTC < de;
  return new Date(Date.UTC(y, m, d, isDST ? 20 : 21, 0, 0));
}
