const subjectInput = document.getElementById("subject");
const colorInput = document.getElementById("color");
const timeEl = document.getElementById("time");
const toggleBtn = document.getElementById("toggle");
const saveBtn = document.getElementById("save");
const listEl = document.getElementById("todayList");
const totalEl = document.getElementById("todayTotal");

let running = false;
let startTime = 0;
let elapsedSec = 0;
let timerId = null;
let weekChart = null;
let ytInterval = null;
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
    
    closeYouTube();

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
  console.log("elapsedSec =", elapsedSec);
  
  if (elapsedSec <= 5) {
    alert("保存する勉強時間がありません");
    return;
  }

  saveStudy(elapsedSec);

  // リセット
  elapsedSec = 0;
  timeEl.textContent = "00:00:00";

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

  const labels = days.map(d => d.slice(5)); // MM-DD

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
      values.push((total / 60).toFixed(2));
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
            text: "勉強時間（時間）"
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
  const values = labels.map(s => (subjects[s].seconds / 3600).toFixed(2));
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
            label: (ctx) => `${ctx.label}：${ctx.raw} 時間`
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

  // YouTube時間加算
  const yt = JSON.parse(localStorage.getItem("youtubeTime")) || {
    remaining: 0,
    enabled: true
  };
  if (yt.enabled) {
    yt.remaining += sec;
    localStorage.setItem("youtubeTime", JSON.stringify(yt));
    updateYTLabel();
  }

  localStorage.setItem("study", JSON.stringify(data));
  renderToday();
  renderMonthPie();
}

function openYouTube() {
  const yt = JSON.parse(localStorage.getItem("youtubeTime"));

  if (!yt.enabled || yt.remaining <= 0) {
    blockYT();
    return;
  }

  if (running) {
    alert("勉強中はYouTubeを開けません");
    return;
  }

  document.getElementById("ytBlock").style.display = "none";
  document.getElementById("ytContainer").style.display = "block";
  document.getElementById("ytFrame").src = "https://www.youtube.com";

  ytInterval = setInterval(() => {
    yt.remaining--;
    saveYT(yt);
    updateYTLabel();

    if (yt.remaining <= 0) {
      closeYouTube();
      alert("YouTubeの時間が終了しました");
    }
  }, 1000);
}

function closeYouTube() {
  clearInterval(ytInterval);

  const frame = document.getElementById("ytFrame");
  frame.src = "about:blank";

  document.getElementById("ytContainer").style.display = "none";
  document.getElementById("ytBlock").style.display = "block";
}

// 外部遷移ブロック
document.addEventListener("click", e => {
  if (!document.getElementById("ytContainer").style.display) return;

  const a = e.target.closest("a");
  if (!a) return;

  e.preventDefault();
  alert("YouTubeはアプリ内でのみ利用できます");
});

function blockYT() {
  document.getElementById("ytContainer").style.display = "none";
  document.getElementById("ytBlock").style.display = "block";
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
}

function editRecord(dateStr, index) {
  const data = JSON.parse(localStorage.getItem("study") || "{}");
  const item = data[dateStr][index];

  const subject = prompt("勉強内容", item.subject);
  if (subject === null) return;

  const timeMin = prompt("勉強時間（分）", Math.floor(item.seconds / 60));
  if (timeMin === null) return;

  const color = prompt("色（#rrggbb）", item.color);
  if (color === null) return;

  item.subject = subject;
  item.seconds = Number(timeMin) * 60;
  item.color = color;

  localStorage.setItem("study", JSON.stringify(data));

  showDayDetail(dateStr);
  renderToday();
  renderCalendar();
  renderWeekChart();
}

function showToast(message = "保存しました") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// 起動時に表示
renderToday();
renderCalendar();
renderWeekChart();
renderMonthPie();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
