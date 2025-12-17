const subjectInput = document.getElementById("subject");
const colorInput = document.getElementById("color");
const timeEl = document.getElementById("time");
const toggleBtn = document.getElementById("toggle");
const saveBtn = document.getElementById("save");
const listEl = document.getElementById("todayList");
const totalEl = document.getElementById("todayTotal");
const editDialog = document.getElementById("editDialog");
const editSubjectInput = document.getElementById("editSubject");
const editColorInput = document.getElementById("editColor");
const saveEditBtn = document.getElementById("saveEdit");
const cancelEditBtn = document.getElementById("cancelEdit");

let running = false;
let startTime = 0;
let elapsedSec = 0;
let timerId = null;
let weekChart = null;
let ytInterval = null;
let ytStartTime = 0; // 視聴開始時刻
let initialRemain = 0; // 視聴開始時の持ち時間
let editingTarget = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0〜11

// 秒 → hh:mm:ss
function format(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor(sec % 3600 / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// 今日の日付（YYYY-MM-DD）
function today() {
  return new Date().toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// START / STOP
toggleBtn.onclick = () => {
  if (!running) {
    if (!subjectInput.value) {
      alert("勉強内容を入力してください");
      return;
    }

    running = true;
    toggleBtn.textContent = "STOP";
    startTime = Date.now();

    timerId = setInterval(() => {
      const sec =
        elapsedSec +
        Math.floor((Date.now() - startTime) / 1000);
      timeEl.textContent = format(sec);
    }, 1000);

  } else {
    running = false;
    toggleBtn.textContent = "START";
    clearInterval(timerId);

    const diff = Math.floor((Date.now() - startTime) / 1000);
    if (diff > 0) {
      elapsedSec += diff;
    }
    timeEl.textContent = format(elapsedSec);
  }
};

saveBtn.onclick = () => {
  if (elapsedSec <= 5) {
    alert("保存する勉強時間がありません");
    return;
  }

  saveStudy(elapsedSec);

  // リセット
  elapsedSec = 0;
  timeEl.textContent = "00:00:00";
  subjectInput.value = "";
  colorInput.value = "#36a2eb";

  showToast();
};

// 今日の履歴表示
function renderToday() {
  listEl.innerHTML = "";

  const data = JSON.parse(localStorage.getItem("study") || "{}");
  const todayData = data[today()] || [];

  todayData.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.subject}：${format(item.seconds)}`;
    li.style.color = item.color;
    listEl.appendChild(li);
  });

  calcTodayTotal();
  renderCalendar();
  renderWeekChart();
}

function calcTodayTotal() {
  const data = JSON.parse(localStorage.getItem("study") || "{}");
  const todayData = data[today()] || [];

  let totalSec = 0;
  todayData.forEach(item => {
    totalSec += item.seconds;
  });

  totalEl.textContent = "合計：" + format(totalSec);
}

function renderCalendar() {
  const cal = document.getElementById("calendar");
  const label = document.getElementById("monthLabel");
  cal.innerHTML = "";

  label.textContent = `${currentYear}年 ${currentMonth + 1}月`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

  const data = JSON.parse(localStorage.getItem("study") || "{}");

  // 曜日ヘッダ
  ["日","月","火","水","木","金","土"].forEach(d => {
    const div = document.createElement("div");
    div.textContent = d;
    div.className = "calendar-header";
    cal.appendChild(div);
  });

  // 空白
  for (let i = 0; i < firstDay; i++) {
    cal.appendChild(document.createElement("div"));
  }

  // 日付
  let monthTotalSec = 0;

  for (let day = 1; day <= lastDate; day++) {
    const dateStr =`${currentYear}-${String(currentMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

    const dayDiv = document.createElement("div");
    dayDiv.className = "day";

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = day;
    dayDiv.appendChild(num);

    // ★ 今日を強調
    if (dateStr === todayStr()) {
        dayDiv.classList.add("today");
    }

    // ★ 勉強した日
    if (data[dateStr]) {
        let total = 0;
        data[dateStr].forEach(i => total += i.seconds);
        monthTotalSec += total;

        dayDiv.classList.add("studied");

        const t = document.createElement("div");
        t.className = "study-time";
        t.textContent = format(total).slice(0,5);
        dayDiv.appendChild(t);
    }

    dayDiv.onclick = () => showDayDetail(dateStr);
    cal.appendChild(dayDiv);
  }

  document.getElementById("monthTotal").textContent =
  "月合計：" + format(monthTotalSec);
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
  renderMonthPie();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
  renderMonthPie();
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function renderWeekChart() {
  const ctx = document.getElementById("weekChart");
  if (!ctx) return;

  const data = JSON.parse(localStorage.getItem("study") || "{}");
  const days = getLast7Days();

  // 科目一覧を集める
  const subjects = {};
  days.forEach(d => {
    if (data[d]) {
      data[d].forEach(item => {
        if (!subjects[item.subject]) {
          subjects[item.subject] = item.color;
        }
      });
    }
  });

  const labels = days.map(d => d.slice(5).replace("-", "/"));

  // datasets 作成
  const datasets = Object.keys(subjects).map(subject => {
    const values = [];

    days.forEach(d => {
      let total = 0;
      if (data[d]) {
        data[d].forEach(item => {
          if (item.subject === subject) {
            total += item.seconds;
          }
        });
      }
      values.push(Math.round(total / 60));
    });

    return {
      label: subject,
      data: values,
      backgroundColor: subjects[subject],
      stack: "study"
    };
  });

  if (weekChart) {
    weekChart.destroy();
  }

  weekChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: "勉強時間（分）"
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}：${ctx.raw} 分`
          }
        }
      }
    }
  });
}

function renderMonthPie() {
  const ctx = document.getElementById("monthPie");
  if (!ctx) return;

  const data = JSON.parse(localStorage.getItem("study") || "{}");

  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2,"0")}`;
  const subjects = {};

  // 今月分だけ集計
  Object.keys(data).forEach(date => {
    if (date.startsWith(monthKey)) {
      data[date].forEach(item => {
        if (!subjects[item.subject]) {
          subjects[item.subject] = {
            seconds: 0,
            color: item.color
          };
        }
        subjects[item.subject].seconds += item.seconds;
      });
    }
  });

  const labels = Object.keys(subjects);
  const values = labels.map(s => subjects[s].seconds / 60);
  const colors = labels.map(s => subjects[s].color);

  if (window.monthPieChart) {
    window.monthPieChart.destroy();
  }

  window.monthPieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}：${Math.round(ctx.raw)} 分`
          }
        }
      }
    }
  });
}

function saveStudy(sec) {
  const data = JSON.parse(localStorage.getItem("study") || "{}");
  const date = today();

  if (!data[date]) data[date] = [];

  data[date].push({
    subject: subjectInput.value,
    color: colorInput.value,
    seconds: sec
  });

  let yt = checkYTDate();

  if (yt.enabled) {
    yt.remaining += sec;
    localStorage.setItem("youtubeTime", JSON.stringify(yt));
    updateYTLabel();
  }

  localStorage.setItem("study", JSON.stringify(data));
  renderToday();
  renderMonthPie();
  renderCalendar();
  renderWeekChart();

  showDayDetail(date);
}

function startYouTube() {
  const yt = checkYTDate();
  
  // 残り時間がない、または機能が無効の場合
  if (!yt.enabled || (yt.remaining || 0) <= 0) {
    alert("YouTubeを見るための持ち時間がありません");
    return;
  }

  if (running) {
    alert("勉強中はYouTubeを開けません");
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission();
  }

  // 視聴開始の記録
  ytStartTime = Date.now();
  initialRemain = yt.remaining;

  // 画面の表示切替
  document.getElementById("openYtBtn").style.display = "none";
  document.getElementById("watchingStatus").style.display = "block";

  // 別タブでYouTubeを開く
  window.open("https://www.youtube.com", "_blank");

  // タイマー開始（1秒ごとにチェック）
  if (ytInterval) clearInterval(ytInterval);
  ytInterval = setInterval(checkYouTubeTime, 1000);
}

function checkYouTubeTime() {
  // 現在の経過時間を計算
  const now = Date.now();
  const elapsed = Math.floor((now - ytStartTime) / 1000);
  
  // 残り時間を計算
  let currentRemain = initialRemain - elapsed;

  // 画面表示更新
  const el = document.getElementById("ytRemain");
  if (el) el.textContent = "残り：" + format(currentRemain < 0 ? 0 : currentRemain);

  // 時間切れチェック
  if (currentRemain <= 0) {
    stopYouTube(); // タイマー停止＆保存
    if (Notification.permission === "granted") {
      new Notification("時間終了", {
        body: "YouTubeの時間が終わりました。アプリに戻って記録してください。",
        icon: "icon-192.png" // アイコンがある場合
      });
    } else {
      // 通知が許可されていない場合は従来どおりアラート（戻ったときに表示される）
      alert("YouTubeの時間が終了しました");
    }
  }
}

function stopYouTube() {
  clearInterval(ytInterval);

  // 最終的な経過時間を計算して保存
  const now = Date.now();
  const elapsed = Math.floor((now - ytStartTime) / 1000);
  
  const yt = JSON.parse(localStorage.getItem("youtubeTime") || "{}");
  yt.remaining = Math.max(0, yt.remaining - elapsed); // マイナスにならないように
  saveYT(yt);

  // 画面を元に戻す
  document.getElementById("watchingStatus").style.display = "none";
  document.getElementById("openYtBtn").style.display = "inline-block";
  
  updateYTLabel();
}

function showDayDetail(dateStr) {
  const detail = document.getElementById("dayDetail");
  const title = document.getElementById("detailTitle");

  const data = JSON.parse(localStorage.getItem("study") || "{}");
  const dayData = data[dateStr] || [];

  title.textContent = `${dateStr} の詳細`;
  detail.innerHTML = "";

  if (dayData.length === 0) {
    detail.innerHTML = "<p>勉強記録はありません</p>";
    return;
  }

  let total = 0;

  dayData.forEach((item, index) => {
    total += item.seconds;

    const row = document.createElement("div");
    row.className = "detail-item";

    const text = document.createElement("span");
    text.style.color = item.color;
    text.textContent = `${item.subject}：${format(item.seconds)}`;

    const btns = document.createElement("span");
    btns.className = "detail-buttons";

    // 編集
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.onclick = () => editRecord(dateStr, index);

    // 削除
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.onclick = () => deleteRecord(dateStr, index);

    btns.appendChild(editBtn);
    btns.appendChild(delBtn);

    row.appendChild(text);
    row.appendChild(btns);

    detail.appendChild(row);
  });

  const totalDiv = document.createElement("div");
  totalDiv.style.fontWeight = "bold";
  totalDiv.textContent = `合計：${format(total)}`;
  detail.appendChild(totalDiv);
}

function deleteRecord(dateStr, index) {
  if (!confirm("この記録を削除しますか？")) return;

  const data = JSON.parse(localStorage.getItem("study") || "{}");
  data[dateStr].splice(index, 1);

  if (data[dateStr].length === 0) {
    delete data[dateStr];
  }

  localStorage.setItem("study", JSON.stringify(data));

  showDayDetail(dateStr);
  renderToday();
  renderCalendar();
  renderWeekChart();
  renderMonthPie();
}

function editRecord(dateStr, index) {
  const data = JSON.parse(localStorage.getItem("study") || "{}");
  const item = data[dateStr][index];

  // 編集対象の場所（日付とインデックス）を記憶しておく
  editingTarget = { date: dateStr, index: index };

  // 現在の値をダイアログに入力済みにしておく
  editSubjectInput.value = item.subject;
  editColorInput.value = item.color;

  document.getElementById("colorPreview").style.backgroundColor = item.color;

  // ダイアログを表示
  editDialog.showModal();
}

saveEditBtn.onclick = () => {
  if (!editingTarget) return;

  const { date, index } = editingTarget;
  const data = JSON.parse(localStorage.getItem("study") || "{}");

  // データが存在すれば更新する（時間は変更しない）
  if (data[date] && data[date][index]) {
    data[date][index].subject = editSubjectInput.value;
    data[date][index].color = editColorInput.value;

    localStorage.setItem("study", JSON.stringify(data));

    // 画面全体を再描画
    showDayDetail(date); // 詳細表示を更新
    renderToday();       // 今日のリスト更新
    renderCalendar();    // カレンダー更新
    renderWeekChart();   // グラフ更新
    renderMonthPie();    // 円グラフ更新
    
    showToast("記録を修正しました");
  }

  editDialog.close();
};

// 「キャンセル」ボタンが押されたとき
cancelEditBtn.onclick = () => {
  editDialog.close();
};

editColorInput.addEventListener("input", (e) => {
  document.getElementById("colorPreview").style.backgroundColor = e.target.value;
});

function showToast(message = "保存しました") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function updateYTLabel() {
  const yt = JSON.parse(localStorage.getItem("youtubeTime")) || { remaining: 0 };
  const el = document.getElementById("ytRemain");
  if (el) {
    el.textContent = "残り：" + format(yt.remaining);
  }
}

// 日付が変わっていたらYouTube時間をリセットする関数
function checkYTDate() {
  // 現在の設定を取得（なければデフォルト作成）
  let yt = JSON.parse(localStorage.getItem("youtubeTime")) || { 
    remaining: 0, 
    enabled: true, 
    date: todayStr() 
  };

  yt.enabled = true;

  // 保存されている日付と今日の日付が違う場合（＝日付が変わった、または初めての実行）
  if (yt.date !== todayStr()) {
    yt.remaining = 0;      // 時間をリセット
    yt.date = todayStr();  // 日付を今日に更新
    localStorage.setItem("youtubeTime", JSON.stringify(yt));
    updateYTLabel();       // 表示も更新
  }
  
  return yt; // 最新の状態を返す
}

function saveYT(yt) {
  localStorage.setItem("youtubeTime", JSON.stringify(yt));
}

// 起動時に表示
renderToday();
renderCalendar();
renderWeekChart();
renderMonthPie();
updateYTLabel();
checkYTDate();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// アプリが手前に戻ってきたとき（アクティブになったとき）に自動更新する
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    
    // 1. YouTubeの持ち越し時間をチェック（日付が変わっていたらリセット）
    checkYTDate();

    // 2. カレンダーの表示月を「今」に合わせ直す
    // （これをしないと月が変わったときに古い月のままになります）
    currentYear = new Date().getFullYear();
    currentMonth = new Date().getMonth();

    // 3. 画面全体を再描画して、今日の正しい日付・データを表示する
    renderToday();
    renderCalendar();
    renderWeekChart();
    renderMonthPie();
    updateYTLabel();

    // 4. 詳細欄も「今日」のものに更新する
    showDayDetail(today());
  }
});