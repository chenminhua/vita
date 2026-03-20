const heatmapEl = document.getElementById('heatmap');
const yearSelectEl = document.getElementById('yearSelect');
const summaryTitleEl = document.getElementById('summaryTitle');
const summaryContentEl = document.getElementById('summaryContent');

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
  const workoutMap = new Map();
  let totalMinutes = 0;

  for (const r of rows) {
    dayMap.set(r.iso, (dayMap.get(r.iso) || 0) + r.minutes);
    workoutMap.set(r.workout, (workoutMap.get(r.workout) || 0) + r.minutes);
    totalMinutes += r.minutes;
  }

  return { dayMap, workoutMap, totalMinutes };
}

function levelFromMinutes(minutes) {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function renderHeatmap(year, dayMap) {
  heatmapEl.innerHTML = '';

  const start = new Date(`${year}-01-01T00:00:00`);
  const end = new Date(`${year}-12-31T00:00:00`);

  const sundayAlignedStart = new Date(start);
  sundayAlignedStart.setDate(start.getDate() - start.getDay());

  for (let d = new Date(sundayAlignedStart); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const minutes = dayMap.get(iso) || 0;
    const level = levelFromMinutes(minutes);

    const cell = document.createElement('div');
    cell.className = `day lv${level}`;
    cell.title = `${iso}: ${minutes}min`;
    heatmapEl.appendChild(cell);
  }
}

function renderSummary(year, workoutMap, totalMinutes) {
  summaryTitleEl.textContent = `${year} summary`;
  const items = [...workoutMap.entries()].sort((a, b) => b[1] - a[1]);

  const lines = items.map(([name, min]) => `${name} ${formatMinutes(min)}`);
  lines.push('');
  lines.push(`总计运动 ${formatMinutes(totalMinutes)}`);

  summaryContentEl.textContent = lines.join('\n');
}

const REPO_OWNER = 'chenminhua';
const REPO_NAME = 'vita';
const REPO_BRANCH = 'main';

function rawFileUrl(fileName) {
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${fileName}`;
}

async function loadYear(year) {
  const res = await fetch(rawFileUrl(`${year}.md`));
  if (!res.ok) throw new Error(`无法读取 ${year}.md`);
  const md = await res.text();
  const rows = parseYearMd(md, year);
  const { dayMap, workoutMap, totalMinutes } = buildDayMap(rows);

  renderHeatmap(year, dayMap);
  renderSummary(year, workoutMap, totalMinutes);
}

async function discoverYears() {
  try {
    const api = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;
    const res = await fetch(api);
    if (!res.ok) throw new Error('GitHub API failed');
    const files = await res.json();

    const years = files
      .map((f) => f.name)
      .filter((name) => /^\d{4}\.md$/.test(name))
      .map((name) => Number(name.replace('.md', '')))
      .sort((a, b) => b - a);

    if (years.length > 0) return years;
  } catch {
    // ignore and fallback
  }

  const currentYear = new Date().getFullYear();
  return [currentYear];
}

(async function init() {
  const years = await discoverYears();
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
