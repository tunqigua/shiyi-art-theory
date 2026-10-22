(function () {
  "use strict";

  var BANK = window.SHIYI_QUESTION_BANK;
  var STORAGE_KEY = "shiyi-art-theory-progress-v1";
  var state = loadState();
  var session = { queue: [], index: 0, answered: false, startedAt: 0, timer: null, mode: "chapter", selected: null };
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
    var d = date || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function getQuestion(id) {
    return BANK.questions.find(function (q) { return q.id === id; });
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
    session.selected = null;
    session.startedAt = Date.now();
    setView("practice");
    renderQuestion();
    startTimer();
  }

  function renderQuestion() {
    var question = session.queue[session.index];
    if (!question) return;
    var chapter = BANK.chapters.find(function (item) { return item.id === question.chapter; });
    var modeNames = { chapter: "UNIT PRACTICE", mix: "RAPID MIX", mistakes: "MISTAKE RETRY" };
    byId("practiceModeLabel").textContent = modeNames[session.mode];
    byId("practiceTitle").textContent = session.mode === "chapter" ? chapter.title : (session.mode === "mix" ? "疯狂混练" : "错题重练");
    byId("chapterTag").textContent = chapter.title;
    byId("demoTag").textContent = question.demo ? "演示题" : "正式题";
    byId("questionText").textContent = question.stem;
    byId("questionPosition").textContent = (session.index + 1) + " / " + session.queue.length;
    byId("questionProgressBar").style.width = ((session.index + 1) / session.queue.length * 100) + "%";
    byId("answerPanel").hidden = true;
    byId("answerPanel").classList.remove("is-wrong");
    byId("nextButton").disabled = true;
    byId("nextButton").innerHTML = session.index === session.queue.length - 1 ? "完成本组 <span>✓</span>" : "下一题 <span>→</span>";
    renderFavorite(question.id);

    var options = byId("optionsList");
    options.innerHTML = "";
    question.options.forEach(function (text, index) {
      var button = document.createElement("button");
      button.className = "option-button";
      button.innerHTML = "<b>" + String.fromCharCode(65 + index) + "</b><span>" + text + "</span>";
      button.addEventListener("click", function () { answerQuestion(index); });
      options.appendChild(button);
    });
  }

  function answerQuestion(selectedIndex) {
    if (session.answered) return;
    session.answered = true;
    session.selected = selectedIndex;
    stopTimer();
    var question = session.queue[session.index];
    var correct = selectedIndex === question.answer;
    var durationMs = Math.max(300, Date.now() - session.startedAt);
    var buttons = Array.from(document.querySelectorAll(".option-button"));
    buttons.forEach(function (button, index) {
      button.disabled = true;
      if (index === question.answer) button.classList.add("is-correct");
      if (index === selectedIndex && !correct) button.classList.add("is-wrong");
    });
    var panel = byId("answerPanel");
    panel.hidden = false;
    panel.classList.toggle("is-wrong", !correct);
    byId("answerStatus").textContent = correct ? "回答正确 · " + formatSeconds(durationMs) : "回答错误 · 正确答案为 " + String.fromCharCode(65 + question.answer);
    byId("answerExplanation").textContent = question.explanation;
    byId("nextButton").disabled = false;
    recordAttempt(question, correct, durationMs, selectedIndex);
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
    byId("favoriteButton").textContent = active ? "★" : "☆";
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
      row.innerHTML = "<span class=\"unit-label\">UNIT " + String(question.chapter).padStart(2, "0") + "</span><div><h3>" + question.stem + "</h3><p>累计错 " + stat.wrongCount + " 次 · 最近用时 " + formatSeconds(stat.lastDurationMs) + "</p></div><button>单题重练</button>";
      row.querySelector("button").addEventListener("click", function () { startMix([question]); });
      list.appendChild(row);
    });
  }

  function renderRecords() {
    var attempts = state.attempts;
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
      var date = new Date(attempt.at);
      row.innerHTML = "<span>第" + attempt.chapter + "章</span><span>" + q.stem + "</span><span class=\"result-dot " + (attempt.correct ? "" : "wrong") + "\">" + (attempt.correct ? "正确" : "错误") + "</span><span>" + formatSeconds(attempt.durationMs) + " · " + (date.getMonth() + 1) + "/" + date.getDate() + "</span>";
      log.appendChild(row);
    });
  }

  function refreshSummary() {
    var today = todayKey();
    var todayAttempts = state.attempts.filter(function (attempt) { return todayKey(new Date(attempt.at)) === today; });
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
    byId("continueButton").addEventListener("click", function () { startChapter(1); });
    byId("nextButton").addEventListener("click", nextQuestion);
    byId("favoriteButton").addEventListener("click", toggleFavorite);
    byId("retryMistakesButton").addEventListener("click", function () { startMix(mistakeQuestions()); });
    document.addEventListener("keydown", function (event) {
      if (!views.practice.classList.contains("is-visible")) return;
      if (event.key >= "1" && event.key <= "4" && !session.answered) answerQuestion(Number(event.key) - 1);
      if (event.key === "Enter" && session.answered) nextQuestion();
    });
  }

  function initDate() {
    var date = new Date();
    var days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    byId("todayLabel").textContent = date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日";
    byId("dateChip").textContent = String(date.getMonth() + 1).padStart(2, "0") + "." + String(date.getDate()).padStart(2, "0") + " / " + days[date.getDay()];
  }

  initDate();
  bindEvents();
  refreshAll();
})();
