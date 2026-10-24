(function () {
  "use strict";

  var BANK = window.SHIYI_QUESTION_BANK;
  var STORAGE_KEY = "shiyi-art-theory-progress-v1";
  var state = loadState();
  var session = { queue: [], index: 0, answered: false, startedAt: 0, timer: null, mode: "chapter", selected: null };
  var studyStartedAt = null;
  var calendarMonth = null;
  var beijingDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  var views = {
    overview: document.getElementById("overviewView"),
    practice: document.getElementById("practiceView"),
    mistakes: document.getElementById("mistakesView"),
    records: document.getElementById("recordsView")
  };

  function loadState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Object.assign({ attempts: [], questionStats: {}, favorites: [] }, parsed || {});
    } catch (error) {
      return { attempts: [], questionStats: {}, favorites: [] };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function formatSeconds(ms) {
    if (!ms && ms !== 0) return "—";
    return (ms / 1000).toFixed(1) + " 秒";
  }

  function todayKey(date) {
    var parts = beijingDate.formatToParts(date || new Date());
    return ["year", "month", "day"].map(function (type) { return parts.find(function (p) { return p.type === type; }).value; }).join("-");
  }

  function getQuestion(id) {
    return BANK.questions.find(function (q) { return q.id === id; });
  }

  function migrateRecords() {
    if (!state.dailyStudyMs) {
      state.dailyStudyMs = {};
      state.attempts.forEach(function (attempt) {
        if (!Number.isFinite(Date.parse(attempt.at))) return;
        var day = todayKey(new Date(attempt.at));
        state.dailyStudyMs[day] = (state.dailyStudyMs[day] || 0) + (Number(attempt.durationMs) || 0);
      });
      state.studyHistoryEstimated = state.attempts.length > 0;
    }
    BANK.questions.filter(function (q) { return q.answerRevision; }).forEach(function (q) {
      var rows = state.attempts.filter(function (a) { return a.questionId === q.id; });
      var stat = state.questionStats[q.id];
      rows.forEach(function (attempt) {
        var selection = Array.isArray(attempt.selectedIndex) ? attempt.selectedIndex : [attempt.selectedIndex];
        if (!selection.every(Number.isInteger)) return;
        var correct = JSON.stringify(selection.slice().sort()) === JSON.stringify(q.answers.slice().sort());
        if (correct !== attempt.correct) {
          if (stat) stat.wrongCount = Math.max(0, stat.wrongCount + (correct ? -1 : 1));
          var dayCounts = state.dailyAnswers && state.dailyAnswers[todayKey(new Date(attempt.at))];
          if (dayCounts) {
            dayCounts[attempt.correct ? "correct" : "wrong"] = Math.max(0, dayCounts[attempt.correct ? "correct" : "wrong"] - 1);
            dayCounts[correct ? "correct" : "wrong"] += 1;
          }
        }
        attempt.correct = correct;
      });
      if (stat && rows.length) stat.lastCorrect = rows[0].correct;
    });
    if (!state.dailyAnswers) {
      state.dailyAnswers = {};
      state.attempts.forEach(function (attempt) {
        if (!getQuestion(attempt.questionId) || !Number.isFinite(Date.parse(attempt.at))) return;
        addDailyAnswer(todayKey(new Date(attempt.at)), attempt.correct);
      });
      state.dailyAnswersEstimated = state.attempts.length > 0;
    }
    saveState();
  }

  function addDailyAnswer(day, correct) {
    if (!state.dailyAnswers[day]) state.dailyAnswers[day] = { correct: 0, wrong: 0 };
    state.dailyAnswers[day][correct ? "correct" : "wrong"] += 1;
  }

  function flushStudyTime() {
    if (studyStartedAt === null) return;
    var end = Date.now();
    var start = studyStartedAt;
    studyStartedAt = end;
    // 休眠或长时间无响应时，最多补计一个30秒采样周期。
    start = Math.max(start, end - 30000);
    while (start < end) {
      var key = todayKey(new Date(start));
      var midnight = Date.parse(key + "T00:00:00+08:00") + 86400000;
      var until = Math.min(midnight, end);
      state.dailyStudyMs[key] = (state.dailyStudyMs[key] || 0) + until - start;
      start = until;
    }
    saveState();
  }

  function getChapterQuestions(chapterId) {
    return BANK.questions.filter(function (q) { return q.chapter === chapterId; });
  }

  function shuffle(items) {
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var hold = result[i];
      result[i] = result[j];
      result[j] = hold;
    }
    return result;
  }

  function showToast(message) {
    var toast = byId("toast");
    toast.textContent = message;
    toast.classList.add("is-showing");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(function () { toast.classList.remove("is-showing"); }, 2200);
  }

  function setView(name) {
    flushStudyTime();
    studyStartedAt = name === "practice" && !document.hidden ? Date.now() : null;
    Object.keys(views).forEach(function (key) {
      views[key].classList.toggle("is-visible", key === name);
    });
    document.querySelectorAll(".rail-item[data-view]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.view === name || (name === "practice" && button.dataset.view === "overview"));
    });
    var titles = { overview: "学习总览", practice: "正在练习", mistakes: "错题本", records: "学习记录" };
    byId("pageTitle").textContent = titles[name];
    closeUnitPanel();
    if (name !== "practice") stopTimer();
    if (name === "mistakes") renderMistakes();
    if (name === "records") renderRecords();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openUnitPanel() {
    byId("unitPanel").classList.add("is-open");
    byId("unitPanel").setAttribute("aria-hidden", "false");
    byId("unitTrigger").setAttribute("aria-expanded", "true");
    byId("panelBackdrop").hidden = false;
  }

  function closeUnitPanel() {
    byId("unitPanel").classList.remove("is-open");
    byId("unitPanel").setAttribute("aria-hidden", "true");
    byId("unitTrigger").setAttribute("aria-expanded", "false");
    byId("panelBackdrop").hidden = true;
  }

  function chapterStats(chapterId) {
    var ids = getChapterQuestions(chapterId).map(function (q) { return q.id; });
    var attempted = ids.filter(function (id) { return Boolean(state.questionStats[id]); });
    var correct = attempted.filter(function (id) { return state.questionStats[id].lastCorrect; });
    return { total: ids.length, attempted: attempted.length, correct: correct.length };
  }

  function renderChapters() {
    var grid = byId("chapterGrid");
    var map = byId("chapterMap");
    grid.innerHTML = "";
    map.innerHTML = "";
    BANK.chapters.forEach(function (chapter) {
      var stats = chapterStats(chapter.id);
      var button = document.createElement("button");
      button.className = "chapter-button" + (stats.total ? "" : " is-empty");
      button.innerHTML = "<strong>" + chapter.title + "</strong><span>" + chapter.subtitle + "</span><em>" + (stats.total ? stats.attempted + " / " + stats.total + " 已练" : "题库待录入") + "</em>";
      button.addEventListener("click", function () { startChapter(chapter.id); });
      grid.appendChild(button);

      var node = document.createElement("button");
      node.className = "map-node" + (stats.total ? " has-content" : "");
      var percent = stats.total ? Math.round((stats.attempted / stats.total) * 100) : 0;
      node.innerHTML = "<strong>" + String(chapter.id).padStart(2, "0") + "</strong><span>" + (stats.total ? stats.attempted + "/" + stats.total : "待录入") + "</span><i style=\"width:" + percent + "%\"></i>";
      node.addEventListener("click", function () { startChapter(chapter.id); });
      map.appendChild(node);
    });
  }

  function startChapter(chapterId) {
    var questions = getChapterQuestions(chapterId);
    if (!questions.length) {
      showToast("第" + chapterId + "章等待你提供正式题库");
      return;
    }
    session.queue = shuffle(questions);
    session.index = 0;
    session.mode = "chapter";
    beginQuestion();
  }

  function startMix(customQuestions) {
    var source = customQuestions || BANK.questions;
    if (!source.length) {
      showToast("题库加入后即可开始疯狂混练");
      return;
    }
    session.queue = shuffle(source);
    session.index = 0;
    session.mode = customQuestions ? "mistakes" : "mix";
    beginQuestion();
  }

  function beginQuestion() {
    session.answered = false;
    session.selected = [];
    session.startedAt = Date.now();
    setView("practice");
    renderQuestion();
    startTimer();
  }

  function renderQuestion() {
    var question = session.queue[session.index];
    if (!question) return;
    var chapter = BANK.chapters.find(function (item) { return item.id === question.chapter; });
    byId("practiceTitle").textContent = session.mode === "chapter" ? chapter.title : (session.mode === "mix" ? "疯狂混练" : "错题重练");
    byId("chapterTag").textContent = chapter.title;
    byId("questionText").textContent = question.stem;
    byId("questionType").textContent = question.multiple ? "多选题 · 选完提交" : "单选题";
    byId("submitButton").hidden = !question.multiple;
    byId("submitButton").disabled = true;
    byId("questionPosition").textContent = (session.index + 1) + " / " + session.queue.length;
    byId("questionProgressBar").style.width = ((session.index + 1) / session.queue.length * 100) + "%";
    byId("answerPanel").hidden = true;
    byId("answerPanel").classList.remove("is-wrong");
    byId("nextButton").disabled = true;
    byId("nextButton").innerHTML = session.index === session.queue.length - 1 ? "完成本组" : "下一题";
    renderFavorite(question.id);

    var options = byId("optionsList");
    options.innerHTML = "";
    question.options.forEach(function (text, index) {
      var button = document.createElement("button");
      button.className = "option-button";
      var label = document.createElement("b");
      label.textContent = String.fromCharCode(65 + index);
      var content = document.createElement("span");
      content.textContent = text;
      button.append(label, content);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () { selectOption(index); });
      options.appendChild(button);
    });
  }

  function selectOption(index) {
    if (session.answered) return;
    var question = session.queue[session.index];
    if (index < 0 || index >= question.options.length) return;
    if (!question.multiple) return answerQuestion([index]);
    var position = session.selected.indexOf(index);
    if (position < 0) session.selected.push(index);
    else session.selected.splice(position, 1);
    var button = byId("optionsList").children[index];
    button.classList.toggle("is-selected", position < 0);
    button.setAttribute("aria-pressed", String(position < 0));
    byId("submitButton").disabled = !session.selected.length;
  }

  function answerQuestion(selectedIndices) {
    if (session.answered) return;
    if (!selectedIndices.length) return;
    session.answered = true;
    session.selected = selectedIndices.slice().sort();
    stopTimer();
    var question = session.queue[session.index];
    var expected = question.answers || [question.answer];
    var correct = JSON.stringify(session.selected) === JSON.stringify(expected.slice().sort());
    byId("submitButton").hidden = true;
    var durationMs = Math.max(300, Date.now() - session.startedAt);
    var buttons = Array.from(document.querySelectorAll(".option-button"));
    buttons.forEach(function (button, index) {
      button.disabled = true;
      button.classList.remove("is-selected");
      if (expected.indexOf(index) !== -1) button.classList.add("is-correct");
      if (selectedIndices.indexOf(index) !== -1 && expected.indexOf(index) === -1) button.classList.add("is-wrong");
    });
    var panel = byId("answerPanel");
    panel.hidden = false;
    panel.classList.toggle("is-wrong", !correct);
    byId("answerStatus").textContent = correct ? "✓" : "✕";
    byId("answerStatus").setAttribute("aria-label", correct ? "正确" : "错误");
    byId("answerExplanation").textContent = question.explanation;
    byId("nextButton").disabled = false;
    recordAttempt(question, correct, durationMs, session.selected.slice());
    refreshSummary();
  }

  function recordAttempt(question, correct, durationMs, selectedIndex) {
    var current = state.questionStats[question.id] || { attempts: 0, wrongCount: 0, bestMs: null };
    current.attempts += 1;
    current.wrongCount += correct ? 0 : 1;
    current.lastCorrect = correct;
    current.lastDurationMs = durationMs;
    current.bestMs = current.bestMs === null ? durationMs : Math.min(current.bestMs, durationMs);
    current.lastAt = new Date().toISOString();
    state.questionStats[question.id] = current;
    addDailyAnswer(todayKey(), correct);
    state.attempts.unshift({ questionId: question.id, chapter: question.chapter, correct: correct, durationMs: durationMs, selectedIndex: selectedIndex, at: new Date().toISOString() });
    state.attempts = state.attempts.slice(0, 500);
    saveState();
  }

  function nextQuestion() {
    if (!session.answered) return;
    if (session.index >= session.queue.length - 1) {
      showToast("本组完成，记录已保存");
      setView("overview");
      refreshAll();
      return;
    }
    session.index += 1;
    beginQuestion();
  }

  function startTimer() {
    stopTimer();
    byId("liveTimer").textContent = "0.0 秒";
    session.timer = setInterval(function () {
      var seconds = (Date.now() - session.startedAt) / 1000;
      byId("liveTimer").textContent = seconds.toFixed(1) + " 秒";
    }, 100);
  }

  function stopTimer() {
    if (session.timer) clearInterval(session.timer);
    session.timer = null;
  }

  function renderFavorite(questionId) {
    var active = state.favorites.indexOf(questionId) !== -1;
    byId("favoriteButton").classList.toggle("is-favorite", active);
    byId("favoriteButton").textContent = active ? "已收藏" : "收藏";
  }

  function toggleFavorite() {
    var question = session.queue[session.index];
    if (!question) return;
    var index = state.favorites.indexOf(question.id);
    if (index === -1) state.favorites.push(question.id);
    else state.favorites.splice(index, 1);
    saveState();
    renderFavorite(question.id);
    showToast(index === -1 ? "已收藏本题" : "已取消收藏");
  }

  function mistakeQuestions() {
    return BANK.questions.filter(function (question) {
      return state.questionStats[question.id] && state.questionStats[question.id].wrongCount > 0;
    }).sort(function (a, b) {
      return state.questionStats[b.id].wrongCount - state.questionStats[a.id].wrongCount;
    });
  }

  function renderMistakes() {
    var questions = mistakeQuestions();
    var list = byId("mistakeList");
    byId("mistakeSummary").textContent = questions.length ? questions.length + " 道错题等待巩固" : "暂无错题";
    byId("retryMistakesButton").disabled = !questions.length;
    if (!questions.length) {
      list.innerHTML = "<div class=\"empty-state\"><div><strong>这里还很干净</strong><span>答错的题会自动出现在这里。</span></div></div>";
      return;
    }
    list.innerHTML = "";
    questions.forEach(function (question) {
      var stat = state.questionStats[question.id];
      var row = document.createElement("article");
      row.className = "mistake-row";
      row.innerHTML = "<span class=\"unit-label\">第" + question.chapter + "章</span><div><h3>" + question.stem + "</h3><p>累计错 " + stat.wrongCount + " 次 · 最近用时 " + formatSeconds(stat.lastDurationMs) + "</p></div><button>单题重练</button>";
      var answer = document.createElement("p");
      answer.className = "correct-answer";
      answer.textContent = "正确答案：" + question.answers.map(function (i) { return String.fromCharCode(65 + i) + " · " + question.options[i]; }).join("；");
      row.querySelector("div").appendChild(answer);
      if (question.answerRevision) {
        var note = document.createElement("p");
        note.textContent = question.explanation;
        row.querySelector("div").appendChild(note);
      }
      row.querySelector("button").addEventListener("click", function () { startMix([question]); });
      list.appendChild(row);
    });
  }

  function renderRecords() {
    initDate();
    renderStudyDates();
    var attempts = state.attempts.filter(function (attempt) { return Boolean(getQuestion(attempt.questionId)); });
    var correct = attempts.filter(function (a) { return a.correct; });
    var average = attempts.length ? attempts.reduce(function (sum, a) { return sum + a.durationMs; }, 0) / attempts.length : null;
    var fastest = attempts.length ? Math.min.apply(null, attempts.map(function (a) { return a.durationMs; })) : null;
    byId("allAttempts").textContent = attempts.length;
    byId("allAccuracy").textContent = attempts.length ? Math.round(correct.length / attempts.length * 100) + "%" : "—";
    byId("allSpeed").textContent = formatSeconds(average);
    byId("fastestSpeed").textContent = formatSeconds(fastest);

    var unitRecords = byId("unitRecords");
    unitRecords.innerHTML = "";
    BANK.chapters.forEach(function (chapter) {
      var rows = attempts.filter(function (a) { return a.chapter === chapter.id; });
      var correctRows = rows.filter(function (a) { return a.correct; });
      var accuracy = rows.length ? Math.round(correctRows.length / rows.length * 100) : 0;
      var speed = rows.length ? rows.reduce(function (sum, a) { return sum + a.durationMs; }, 0) / rows.length : null;
      var row = document.createElement("div");
      row.className = "unit-record-row";
      row.innerHTML = "<b>" + String(chapter.id).padStart(2, "0") + "</b><div class=\"mini-track\"><i style=\"width:" + accuracy + "%\"></i></div><span>" + (rows.length ? accuracy + "%" : "暂无") + "</span><span>" + formatSeconds(speed) + "</span>";
      unitRecords.appendChild(row);
    });

    var log = byId("attemptLog");
    log.innerHTML = "";
    if (!attempts.length) {
      log.innerHTML = "<div class=\"empty-state\"><div><strong>还没有练习记录</strong><span>完成一道题后，时间线会从这里开始。</span></div></div>";
      return;
    }
    attempts.slice(0, 20).forEach(function (attempt) {
      var q = getQuestion(attempt.questionId);
      if (!q) return;
      var row = document.createElement("div");
      row.className = "attempt-row";
      var date = todayKey(new Date(attempt.at)).slice(5).replace("-", "/");
      row.innerHTML = "<span>第" + attempt.chapter + "章</span><span>" + q.stem + "</span><span class=\"result-dot " + (attempt.correct ? "" : "wrong") + "\">" + (attempt.correct ? "正确" : "错误") + "</span><span>" + formatSeconds(attempt.durationMs) + " · " + date + "</span>";
      log.appendChild(row);
    });
  }

  function renderStudyDates() {
    var today = todayKey();
    var current = today.split("-").map(Number);
    if (!calendarMonth) calendarMonth = { year: current[0], month: current[1] - 1 };
    var year = calendarMonth.year;
    var month = calendarMonth.month;
    var firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    var dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    var weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    byId("recordsToday").textContent = "今天是 " + current[0] + "年" + current[1] + "月" + current[2] + "日 · " + weekdays[new Date(today + "T00:00:00Z").getUTCDay()] + "（北京时间）";
    byId("calendarMonth").textContent = year + "年" + (month + 1) + "月";
    byId("calendarGrid").setAttribute("aria-label", year + "年" + (month + 1) + "月学习日历");
    byId("studyTimeNote").hidden = !(state.studyHistoryEstimated || state.dailyAnswersEstimated);
    byId("studyTimeNote").textContent = "更新前的统计由现存记录补算，可能不完整；未记录不代表没有学习。";
    var grid = byId("calendarGrid");
    grid.innerHTML = "";
    var cellCount = Math.ceil((firstWeekday + dayCount) / 7) * 7;
    for (var cell = 0; cell < cellCount; cell += 1) {
      var day = cell - firstWeekday + 1;
      var box = document.createElement("div");
      if (day < 1 || day > dayCount) {
        box.className = "calendar-blank";
        box.setAttribute("aria-hidden", "true");
        grid.appendChild(box);
        continue;
      }
      var key = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      var counts = state.dailyAnswers[key];
      var recorded = Object.prototype.hasOwnProperty.call(state.dailyStudyMs, key) || Boolean(counts);
      var future = key > today;
      box.className = "calendar-day" + (key === today ? " is-today" : "") + (future ? " is-future" : "");
      box.dataset.date = key;
      var date = document.createElement("time");
      date.dateTime = key;
      date.textContent = day;
      box.appendChild(date);
      if (key === today) {
        box.setAttribute("aria-current", "date");
        var badge = document.createElement("span");
        badge.className = "calendar-today";
        badge.textContent = "今天";
        box.appendChild(badge);
      }
      var duration = document.createElement("span");
      duration.className = "calendar-duration";
      if (recorded || key === today) {
        var ms = state.dailyStudyMs[key] || 0;
        duration.textContent = ms >= 3600000 ? (ms / 3600000).toFixed(1) + "小时" : (ms / 60000).toFixed(ms > 0 && ms < 60000 ? 1 : 0) + "分钟";
        var results = document.createElement("div");
        results.className = "calendar-results";
        var right = document.createElement("span");
        right.textContent = "✓ " + (counts ? counts.correct : 0);
        right.setAttribute("aria-label", "答对" + (counts ? counts.correct : 0) + "次");
        var wrong = document.createElement("span");
        wrong.textContent = "✕ " + (counts ? counts.wrong : 0);
        wrong.setAttribute("aria-label", "答错" + (counts ? counts.wrong : 0) + "次");
        results.append(right, wrong);
        box.append(duration, results);
      } else {
        duration.textContent = future ? "—" : "未记录";
        box.appendChild(duration);
      }
      grid.appendChild(box);
    }
  }

  function changeCalendarMonth(offset) {
    var date = new Date(Date.UTC(calendarMonth.year, calendarMonth.month + offset, 1));
    calendarMonth = { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    renderStudyDates();
  }

  function refreshSummary() {
    var today = todayKey();
    var todayAttempts = state.attempts.filter(function (attempt) { return Boolean(getQuestion(attempt.questionId)) && todayKey(new Date(attempt.at)) === today; });
    var correctToday = todayAttempts.filter(function (attempt) { return attempt.correct; });
    var average = todayAttempts.length ? todayAttempts.reduce(function (sum, a) { return sum + a.durationMs; }, 0) / todayAttempts.length : null;
    byId("todayDone").textContent = todayAttempts.length;
    byId("todayAccuracy").textContent = todayAttempts.length ? Math.round(correctToday.length / todayAttempts.length * 100) + "%" : "—";
    byId("todaySpeed").textContent = formatSeconds(average);
    byId("todayMistakes").textContent = mistakeQuestions().length;
    byId("mistakeNavCount").textContent = mistakeQuestions().length;
    byId("progressRing").style.setProperty("--percent", Math.min(100, todayAttempts.length / 20 * 100));
  }

  function refreshAll() {
    renderChapters();
    refreshSummary();
    renderMistakes();
    renderRecords();
  }

  function bindEvents() {
    byId("previousMonth").addEventListener("click", function () { changeCalendarMonth(-1); });
    byId("nextMonth").addEventListener("click", function () { changeCalendarMonth(1); });
    byId("calendarToday").addEventListener("click", function () { calendarMonth = null; renderStudyDates(); });
    document.querySelectorAll("[data-view]").forEach(function (button) {
      button.addEventListener("click", function () { setView(button.dataset.view); });
    });
    document.querySelectorAll("[data-action=\"mix\"]").forEach(function (button) {
      button.addEventListener("click", function () { startMix(); });
    });
    byId("unitTrigger").addEventListener("click", function () {
      if (byId("unitPanel").classList.contains("is-open")) closeUnitPanel(); else openUnitPanel();
    });
    byId("openUnitsButton").addEventListener("click", openUnitPanel);
    byId("closeUnitPanel").addEventListener("click", closeUnitPanel);
    byId("panelBackdrop").addEventListener("click", closeUnitPanel);
    byId("continueButton").addEventListener("click", openUnitPanel);
    byId("nextButton").addEventListener("click", nextQuestion);
    byId("submitButton").addEventListener("click", function () { answerQuestion(session.selected); });
    byId("favoriteButton").addEventListener("click", toggleFavorite);
    byId("retryMistakesButton").addEventListener("click", function () { startMix(mistakeQuestions()); });
    document.addEventListener("keydown", function (event) {
      if (!views.practice.classList.contains("is-visible")) return;
      if (event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.key >= "1" && event.key <= "9" && !session.answered) selectOption(Number(event.key) - 1);
      if (event.key === "Enter") {
        if (!session.answered && event.target.classList.contains("option-button")) return;
        event.preventDefault();
        if (session.answered) nextQuestion();
        else if (session.queue[session.index].multiple) answerQuestion(session.selected);
      }
    });
  }

  function initDate() {
    var key = todayKey();
    var date = key.split("-").map(Number);
    var days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    byId("todayLabel").textContent = date[0] + "年" + date[1] + "月" + date[2] + "日";
    byId("dateChip").textContent = key.slice(5).replace("-", ".") + " / " + days[new Date(key + "T00:00:00Z").getUTCDay()];
  }

  function renderAudit() {
    byId("bankStatus").textContent = BANK.questions.length + " 个练习项";
    byId("bankSummary").textContent = "已保留 " + BANK.sourceQuestionCount + " 道原题 · " + BANK.gradedSourceCount + " 道进入判分 · 多空题逐空练习";
    byId("auditSummary").textContent = "题库核对说明 · " + BANK.pending.length + " 项待核对（不参与判分）";
    byId("answerPolicy").textContent = BANK.answerPolicy;
    (BANK.corrections || []).forEach(function (q) {
      var item = document.createElement("article");
      var title = document.createElement("strong");
      title.textContent = q.id + " · 更正答案 " + q.key;
      var note = document.createElement("p");
      note.textContent = q.note;
      var link = document.createElement("a");
      link.href = q.url;
      link.textContent = "核对依据";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(title, note, link);
      byId("correctedQuestions").appendChild(item);
    });
    BANK.pending.forEach(function (q) {
      var item = document.createElement("article");
      var title = document.createElement("strong");
      title.textContent = "第" + q.chapter + "章 · " + (q.kind === "s" ? "单选" : "多选") + q.number + (q.page ? " · 原书第" + q.page + "页" : "");
      var reason = document.createElement("p");
      reason.textContent = q.reason;
      item.append(title, reason);
      if (q.stem) {
        var stem = document.createElement("p");
        stem.textContent = q.stem;
        item.appendChild(stem);
        q.options.forEach(function (option, index) {
          var line = document.createElement("div");
          line.textContent = String.fromCharCode(65 + index) + " · " + option;
          item.appendChild(line);
        });
      }
      var key = document.createElement("p");
      key.textContent = q.originalKey ? "原书参考答案（未采用）：" + q.originalKey : "未找到独立对应的参考答案";
      item.appendChild(key);
      byId("pendingQuestions").appendChild(item);
    });
  }

  migrateRecords();
  document.addEventListener("visibilitychange", function () {
    flushStudyTime();
    studyStartedAt = !document.hidden && views.practice.classList.contains("is-visible") ? Date.now() : null;
    if (!document.hidden) { initDate(); if (views.records.classList.contains("is-visible")) renderStudyDates(); }
  });
  window.addEventListener("pagehide", function () { flushStudyTime(); studyStartedAt = null; });
  window.addEventListener("pageshow", function () {
    if (!document.hidden && views.practice.classList.contains("is-visible")) studyStartedAt = Date.now();
  });
  setInterval(function () {
    flushStudyTime();
    initDate();
    if (views.records.classList.contains("is-visible")) renderStudyDates();
  }, 15000);
  initDate();
  renderAudit();
  bindEvents();
  refreshAll();
})();
