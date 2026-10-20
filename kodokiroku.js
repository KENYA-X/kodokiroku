// ---- タイマー ----
let timerInterval = null;
let timerStartedAt = null;  // Date.now() at start
let pausedElapsed = 0;      // ms already elapsed before current run

function pad(n) { return String(n).padStart(2, '0'); }

function secondsToHMS(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function nowTimeString() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function getElapsedSeconds() {
  if (timerStartedAt === null) return Math.floor(pausedElapsed / 1000);
  return Math.floor((pausedElapsed + Date.now() - timerStartedAt) / 1000);
}

function updateDisplay() {
  const s = getElapsedSeconds();
  document.getElementById('timerDisplay').textContent = secondsToHMS(s);
  document.getElementById('inputElapsed').value = secondsToHMS(s);
}

const TIMER_KEY = 'kodokiroku_timer';

function saveTimerState() {
  localStorage.setItem(TIMER_KEY, JSON.stringify({
    timerStartedAt,
    pausedElapsed,
    inputStart: document.getElementById('inputStart').value,
    inputDate:  document.getElementById('inputDate').value,
  }));
}

function clearTimerState() {
  localStorage.removeItem(TIMER_KEY);
}

function startTimer() {
  if (timerInterval) return;
  timerStartedAt = Date.now();
  if (!document.getElementById('inputStart').value) {
    document.getElementById('inputStart').value = nowTimeString();
  }
  if (!document.getElementById('inputDate').value) {
    document.getElementById('inputDate').value = todayString();
  }
  saveTimerState();
  timerInterval = setInterval(updateDisplay, 500);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.getElementById('btnStart').disabled = true;
  document.getElementById('btnStop').disabled = false;
}

function onVisibilityChange() {
  if (!document.hidden && timerStartedAt !== null) updateDisplay();
}

function stopTimer() {
  pausedElapsed += Date.now() - timerStartedAt;
  timerStartedAt = null;
  clearInterval(timerInterval);
  timerInterval = null;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  clearTimerState();
  updateDisplay();
  document.getElementById('inputEnd').value = nowTimeString();
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnStop').disabled = true;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerStartedAt = null;
  pausedElapsed = 0;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  clearTimerState();
  document.getElementById('timerDisplay').textContent = '00:00:00';
  document.getElementById('inputElapsed').value = '';
  document.getElementById('inputStart').value = '';
  document.getElementById('inputEnd').value = '';
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnStop').disabled = true;
}

function restoreTimer() {
  const saved = localStorage.getItem(TIMER_KEY);
  if (!saved) return;
  const state = JSON.parse(saved);
  pausedElapsed  = state.pausedElapsed;
  timerStartedAt = state.timerStartedAt;
  document.getElementById('inputStart').value = state.inputStart;
  document.getElementById('inputDate').value  = state.inputDate;
  updateDisplay();
  timerInterval = setInterval(updateDisplay, 500);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.getElementById('btnStart').disabled = true;
  document.getElementById('btnStop').disabled = false;
}

// ---- ローカルストレージ ----
const STORAGE_KEY = 'kodokiroku_records';

function loadRecords() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ---- 保存 ----
function saveRecord() {
  const date    = document.getElementById('inputDate').value;
  const name    = document.getElementById('inputName').value.trim();
  const start   = document.getElementById('inputStart').value;
  const end     = document.getElementById('inputEnd').value;
  const elapsed = document.getElementById('inputElapsed').value;

  if (!name) { alert('名称を選択してください'); return; }

  const records = loadRecords();
  records.push({ id: Date.now(), date, name, start, end, elapsed });
  saveRecords(records);
  renderList();

  document.getElementById('inputName').selectedIndex = 0;
  resetTimer();
}

// ---- 削除 ----
function deleteRecord(id) {
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderList();
}

// ---- リスト描画 ----
function renderList() {
  const records   = loadRecords();
  const container = document.getElementById('recordBody');
  const emptyMsg  = document.getElementById('emptyMsg');

  container.innerHTML = '';

  if (records.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  const groups = {};
  records.forEach(r => {
    const key = r.date || '日付なし';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    const div = document.createElement('div');
    div.className = 'date-group';
    div.innerHTML = `
      <div class="date-label">${date}</div>
      <table>
        <thead><tr><th>名称</th><th>開始</th><th>終了</th><th>経過時間</th><th></th></tr></thead>
        <tbody>
          ${groups[date].map(r => `
            <tr>
              <td>${r.name}</td>
              <td>${r.start || '-'}</td>
              <td>${r.end || '-'}</td>
              <td>${r.elapsed || '-'}</td>
              <td><button class="btn-delete" onclick="deleteRecord(${r.id})">削除</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.appendChild(div);
  });
}

// ---- CSV エクスポート ----
function exportCSV() {
  const records = loadRecords();
  if (records.length === 0) { alert('エクスポートするデータがありません'); return; }

  const header = ['日付', '名称', '開始時刻', '終了時刻', '経過時間'];
  const rows = records.map(r => [r.date, r.name, r.start, r.end, r.elapsed]);
  const csv = [header, ...rows].map(row =>
    row.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');

  const bom = '﻿';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kodokiroku_${todayString()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- 初期化 ----
document.getElementById('inputDate').value = todayString();
renderList();
restoreTimer();
