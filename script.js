const heatmapEl = document.getElementById('heatmap');
const yearSelectEl = document.getElementById('yearSelect');
const summaryTitleEl = document.getElementById('summaryTitle');
const summaryContentEl = document.getElementById('summaryContent');
const tooltipEl = document.getElementById('tooltip');

// 手动维护可选年份（新增年份时在这里加）
const AVAILABLE_YEARS = [2026];

const toMinutes = (duration) => {
  const t = String(duration).trim().toLowerCase();
  if (t.endsWith('min')) return Number(t.replace('min', '')) || 0;
  if (t.endsWith('h')) return (Number(t.replace('h', '')) || 0) * 60;
  return 0;
};

const formatMinutes = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
};

function parseYearMd(md, year) {
  const lines = md
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.startsWith('|') && !x.includes('-----') && !x.includes('Date'));

  const rows = [];
  for (const line of lines) {
    const cells = line.split('|').map((x) => x.trim()).filter(Boolean);
    if (cells.length < 3) continue;
    const [date, workout, duration] = cells;
    const iso = `${year}-${date}`;
    rows.push({ date, iso, workout, duration, minutes: toMinutes(duration) });
  }
  return rows;
}

function buildDayMap(rows) {
  const dayMap = new Map();
  const dayDetailsMap = new Map();
  const workoutMap = new Map();
  let totalMinutes = 0;

  for (const r of rows) {
    dayMap.set(r.iso, (dayMap.get(r.iso) || 0) + r.minutes);
    workoutMap.set(r.workout, (workoutMap.get(r.workout) || 0) + r.minutes);

    if (!dayDetailsMap.has(r.iso)) dayDetailsMap.set(r.iso, []);
    dayDetailsMap.get(r.iso).push({ workout: r.workout, duration: r.duration, minutes: r.minutes });

    totalMinutes += r.minutes;
  }

  return { dayMap, dayDetailsMap, workoutMap, totalMinutes };
}

function levelFromMinutes(minutes) {
  if (minutes <= 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 90) return 3;
  return 4;
}

function moveTooltip(x, y) {
  const pad = 12;
  tooltipEl.style.left = `${x + pad}px`;
  tooltipEl.style.top = `${y + pad}px`;
}

function showTooltip(text, x, y) {
  tooltipEl.textContent = text;
  tooltipEl.hidden = false;
  moveTooltip(x, y);
}

function hideTooltip() {
  tooltipEl.hidden = true;
}

function renderHeatmap(year, dayMap, dayDetailsMap) {
  heatmapEl.innerHTML = '';

  // 使用 UTC，避免本地时区导致日期偏移（例如周六跑到每周第一格）
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));

  const sundayAlignedStart = new Date(start);
  sundayAlignedStart.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const saturdayAlignedEnd = new Date(end);
  saturdayAlignedEnd.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const weekCount = Math.ceil((saturdayAlignedEnd - sundayAlignedStart + 1) / (7 * 24 * 3600 * 1000));
  heatmapEl.style.gridTemplateColumns = `repeat(${weekCount}, 12px)`;

  for (let d = new Date(sundayAlignedStart); d <= saturdayAlignedEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const isCurrentYear = d.getUTCFullYear() === year;

    const minutes = dayMap.get(iso) || 0;
    const level = isCurrentYear ? levelFromMinutes(minutes) : 0;

    const details = dayDetailsMap.get(iso) || [];
    const detailText = details.length
      ? details.map((x) => `- ${x.workout} ${x.duration}`).join('\n')
      : '无训练';

    const tipText = `${iso}\n${detailText}`;

    const cell = document.createElement('div');
    cell.className = `day lv${level}`;
    if (!isCurrentYear) cell.classList.add('out-of-year');

    cell.addEventListener('mouseenter', (e) => showTooltip(tipText, e.clientX, e.clientY));
    cell.addEventListener('mousemove', (e) => moveTooltip(e.clientX, e.clientY));
    cell.addEventListener('mouseleave', hideTooltip);

    cell.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      showTooltip(tipText, t.clientX, t.clientY);
    }, { passive: true });
    cell.addEventListener('touchend', hideTooltip, { passive: true });

    heatmapEl.appendChild(cell);
  }
}

function renderSummary(year, workoutMap, totalMinutes, dayMap) {
  summaryTitleEl.textContent = `${year} summary`;
  const items = [...workoutMap.entries()].sort((a, b) => b[1] - a[1]);

  const activeDays = [...dayMap.values()].filter((m) => m > 0).length;

  const lines = items.map(([name, min]) => `${name} ${formatMinutes(min)}`);
  lines.push('');
  lines.push(`总计运动 ${activeDays} 天，共 ${formatMinutes(totalMinutes)}`);

  summaryContentEl.textContent = lines.join('\n');
}

function yearDataUrl(year) {
  return `./${year}.md`;
}

async function loadYear(year) {
  const res = await fetch(yearDataUrl(year));
  if (!res.ok) throw new Error(`无法读取 ${year}.md`);
  const md = await res.text();
  const rows = parseYearMd(md, year);
  const { dayMap, dayDetailsMap, workoutMap, totalMinutes } = buildDayMap(rows);

  renderHeatmap(year, dayMap, dayDetailsMap);
  renderSummary(year, workoutMap, totalMinutes, dayMap);
}

(async function init() {
  const years = [...AVAILABLE_YEARS].sort((a, b) => b - a);
  yearSelectEl.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');

  const currentYear = String(new Date().getFullYear());
  if (years.includes(Number(currentYear))) {
    yearSelectEl.value = currentYear;
  }

  await loadYear(Number(yearSelectEl.value));

  yearSelectEl.addEventListener('change', async (e) => {
    await loadYear(Number(e.target.value));
  });
})();
