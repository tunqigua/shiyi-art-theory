(function () {
  "use strict";

  var BANK = window.SHIYI_QUESTION_BANK;
  BANK.questions = BANK.questions.concat(window.SHIYI_FILL_BANK.questions);
  var fillFeedback = window.SHIYI_FILL_FEEDBACK.create(BANK.questions, window.SHIYI_EXPLANATIONS || {});
  var STORAGE_KEY = "shiyi-art-theory-progress-v1";
  var REVIEW_DAYS = [1, 3, 7, 14, 30, 60, 90];
  var state = loadState();
  var session = { queue: [], index: 0, answered: false, startedAt: 0, timer: null, mode: "chapter", selected: null, intro: false };
  var lastOptionOrders = {};
  var studyStartedAt = null;
  var calendarMonth = null;
  var summaryDay = null;
  var mistakeBrowse = { kind: "choice", chapter: "all", subtype: "all", status: "all", wrong: 0, sort: "wrong", query: "", page: 1 };
  var filteredMistakes = [];
  var mistakeScrollTop = 0;
  var beijingDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  var views = {
    overview: document.getElementById("overviewView"),
    practice: document.getElementById("practiceView"),
    mistakes: document.getElementById("mistakesView"),
    records: document.getElementById("recordsView"),
    backup: document.getElementById("backupView"),
    terms: document.getElementById("termsView")
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
    if (!state.dailyQuestionIds) {
      state.dailyQuestionIds = {};
      state.dailyQuestionIdsEstimated = [];
      var retainedCounts = {};
      state.attempts.forEach(function (attempt) {
        if (!getQuestion(attempt.questionId) || !Number.isFinite(Date.parse(attempt.at))) return;
        var day = todayKey(new Date(attempt.at));
        addDailyQuestion(day, attempt.questionId);
        retainedCounts[day] = (retainedCounts[day] || 0) + 1;
      });
      Object.keys(state.questionStats).forEach(function (id) {
        var stat = state.questionStats[id];
        if (getQuestion(id) && Number.isFinite(Date.parse(stat.lastAt))) addDailyQuestion(todayKey(new Date(stat.lastAt)), id);
      });
      Object.keys(state.dailyAnswers).forEach(function (day) {
        var counts = state.dailyAnswers[day];
        if (counts.correct + counts.wrong > (retainedCounts[day] || 0)) state.dailyQuestionIdsEstimated.push(day);
      });
    }
    BANK.questions.forEach(function (q) {
      if (q.type === "fill") {
        var rows = state.attempts.filter(function (a) { return a.questionId === q.id; });
        var stat = state.questionStats[q.id];
        rows.forEach(function (attempt) {
          if (!Array.isArray(attempt.selectedIndex) || attempt.selectedIndex.length !== q.answers.length || !attempt.selectedIndex.every(function (x) { return typeof x === "string"; })) return;
          var correct = window.SHIYI_FILL_UTILS.grade(q, attempt.selectedIndex).every(Boolean);
          // 答案勘误需要双向重判；普通别名或顺序兼容仍只修复误判。
          if (correct === attempt.correct || (!q.fillAnswerRevision && !correct)) return;
          if (stat) stat.wrongCount = Math.max(0, stat.wrongCount + (correct ? -1 : 1));
          var counts = state.dailyAnswers[todayKey(new Date(attempt.at))];
          if (counts) {
            counts[attempt.correct ? "correct" : "wrong"] = Math.max(0, counts[attempt.correct ? "correct" : "wrong"] - 1);
            counts[correct ? "correct" : "wrong"] += 1;
          }
          attempt.correct = correct;
        });
        if (stat && rows.length) stat.lastCorrect = rows[0].correct;
        if (stat && stat.wrongCount === 0) delete stat.review;
      }
      var stat = state.questionStats[q.id];
      if (stat && stat.wrongCount > 0 && !stat.review) stat.review = { step: 0, due: todayKey(), passedDay: null };
    });
    saveState();
  }

  function addDailyAnswer(day, correct) {
    if (!state.dailyAnswers[day]) state.dailyAnswers[day] = { correct: 0, wrong: 0 };
    state.dailyAnswers[day][correct ? "correct" : "wrong"] += 1;
  }

  function addDailyQuestion(day, questionId) {
    if (!state.dailyQuestionIds[day]) state.dailyQuestionIds[day] = [];
    if (state.dailyQuestionIds[day].indexOf(questionId) === -1) state.dailyQuestionIds[day].push(questionId);
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

  function getChapterQuestions(chapterId, kind) {
    return BANK.questions.filter(function (q) { return q.chapter === chapterId && (!kind || (kind === "fill" ? q.type === "fill" : q.type !== "fill")); });
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

  function orderQuestions(questions) {
    var fills = shuffle(questions.filter(function (q) { return q.type === "fill"; }));
    var singles = shuffle(questions.filter(function (q) { return !q.multiple && q.type !== "fill"; }));
    var multiples = shuffle(questions.filter(function (q) { return q.multiple; }));
    return singles.concat(multiples, fills);
  }

  function setView(name) {
    if (views.mistakes.classList.contains("is-visible") && name !== "mistakes") mistakeScrollTop = window.scrollY;
    flushStudyTime();
    studyStartedAt = name === "practice" && !document.hidden ? Date.now() : null;
    Object.keys(views).forEach(function (key) {
      views[key].classList.toggle("is-visible", key === name);
    });
    document.querySelectorAll(".rail-item[data-view]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.view === name || (name === "practice" && button.dataset.view === (session.mode === "review" ? "mistakes" : "overview")));
    });
    var titles = { overview: "学习总览", practice: "正在练习", mistakes: "错题本", records: "学习记录", backup: "计划与备份", terms: "名词解释" };
    byId("pageTitle").textContent = titles[name];
    closeUnitPanel();
    if (name !== "practice") stopTimer();
    if (name === "overview") { renderChapters(); refreshSummary(); }
    if (name === "mistakes") renderMistakes();
    if (name === "records") renderRecords();
    if (name === "backup") renderPlan();
    window.scrollTo({ top: name === "mistakes" ? mistakeScrollTop : 0, behavior: name === "mistakes" ? "instant" : "smooth" });
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

  function chapterStats(chapterId, kind) {
    var ids = getChapterQuestions(chapterId, kind).map(function (q) { return q.id; });
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
      [grid, map].forEach(function (parent) {
        var card = document.createElement("article");
        card.className = parent === grid ? "chapter-button" : "map-node has-content";
        var title = document.createElement("strong");
        title.textContent = parent === grid ? chapter.title : String(chapter.id).padStart(2, "0");
        var subtitle = document.createElement("span"); subtitle.textContent = chapter.subtitle;
        card.append(title, subtitle);
        var actions = document.createElement("div"); actions.className = "chapter-kinds";
        ["choice", "fill"].forEach(function (kind) {
          var stats = chapterStats(chapter.id, kind);
          var button = document.createElement("button");
          button.type = "button"; button.dataset.chapter = chapter.id; button.dataset.kind = kind;
          button.setAttribute("aria-label", chapter.title + (kind === "fill" ? "填空题" : "选择题"));
          var label = document.createElement("b"); label.textContent = kind === "fill" ? "填" : "选";
          var progress = document.createElement("small"); progress.textContent = stats.attempted + "/" + stats.total;
          button.append(label, progress); button.disabled = !stats.total;
          button.addEventListener("click", function () { startChapter(chapter.id, kind); });
          actions.appendChild(button);
        });
        var termStats = window.SHIYI_TERMS.stats(chapter.id);
        var termButton = document.createElement("button"); termButton.type = "button";
        termButton.dataset.kind = "terms"; termButton.dataset.chapter = chapter.id;
        termButton.setAttribute("aria-label", chapter.title + "名词解释");
        termButton.innerHTML = "<b>名</b><small>" + termStats.attempted + "/" + termStats.total + "</small>";
        termButton.addEventListener("click", function () { setView("terms"); window.SHIYI_TERMS.practice(chapter.id); });
        actions.appendChild(termButton);
        card.appendChild(actions); parent.appendChild(card);
      });
    });
  }

  function startChapter(chapterId, kind) {
    var questions = getChapterQuestions(chapterId, kind || "choice");
    if (!questions.length) {
      showToast("第" + chapterId + "章等待你提供正式题库");
      return;
    }
    session.queue = orderQuestions(questions);
    session.index = 0;
    session.mode = "chapter";
    beginQuestion();
  }

  var mixKind = "fill";
  function openMix(kind) {
    mixKind = kind;
    byId("mixScopeTitle").textContent = ({choice:"选择混练",fill:"填空混练",terms:"名解混练"})[kind] + " · 选择范围";
    byId("mixScope").showModal();
  }
  function startMix(range) {
    byId("mixScope").close();
    if (mixKind === "terms") return window.SHIYI_TERMS.mix(range);
    var questions = BANK.questions.filter(function (q) {
      return (q.type === "fill") === (mixKind === "fill") && (range === "all" || (range === "first" ? q.chapter <= 6 : q.chapter >= 7));
    });
    if (!questions.length) return showToast("该范围暂无题目");
    session.queue = shuffle(questions); session.index = 0; session.mode = mixKind + "Mix";
    beginQuestion(true);
  }
  function showTermLibrary() {
    setView("mistakes");
    byId("mistakeLibrary").hidden = true; byId("reviewDashboard").hidden = true; byId("termLibrary").hidden = false;
    document.querySelectorAll("[data-mistake-view]").forEach(function (b) { b.setAttribute("aria-pressed",String(b.dataset.mistakeView === "terms")); });
    window.SHIYI_TERMS.open(Number(byId("termSelect").value) || 1);
  }
  window.SHIYI_TERMS.onPractice = function () { setView("terms"); };
  window.SHIYI_TERMS.onReturn = showTermLibrary;

  function beginQuestion(enterStage) {
    session.answered = false;
    session.selected = [];
    stopTimer();
    setView("practice");
    var question = session.queue[session.index];
    var previous = session.queue[session.index - 1];
    session.intro = session.mode !== "review" && !session.mode.endsWith("Mix") && !enterStage && (!previous || (previous.type === "fill") !== (question.type === "fill") || Boolean(previous.multiple) !== Boolean(question.multiple));
    byId("typeIntro").hidden = !session.intro;
    byId("questionStage").hidden = session.intro;
    if (session.intro) {
      byId("enterStageButton").textContent = question.type === "fill" ? "填空题" : (question.multiple ? "多选题" : "单选题");
      byId("enterStageButton").focus();
      return;
    }
    session.startedAt = Date.now();
    renderQuestion();
    startTimer();
    if (enterStage || session.mode === "review") byId("questionText").focus();
  }

  function renderQuestion() {
    var question = session.queue[session.index];
    if (!question) return;
    var chapter = BANK.chapters.find(function (item) { return item.id === question.chapter; });
    byId("practiceTitle").textContent = session.mode === "chapter" ? chapter.title : (session.mode === "fillMix" ? "填空混练" : session.mode === "choiceMix" ? "选择混练" : "错题重练");
    if (session.mode === "review") byId("practiceTitle").textContent = "错题轮回 · " + ({single:"单选", multiple:"多选", fill:"填空"})[questionKind(question)];
    var backButton = document.querySelector("#questionStage .back-button");
    backButton.dataset.view = session.mode === "review" ? "mistakes" : "overview";
    backButton.textContent = session.mode === "review" ? "返回错题本" : "返回总览";
    byId("chapterTag").textContent = chapter.title;
    var blankNumber = 0;
    byId("questionText").textContent = question.type === "fill" ? question.stem.replace(/____/g, function () { blankNumber += 1; return "（" + blankNumber + "）____"; }) : question.stem;
    byId("questionType").textContent = question.type === "fill" ? "填空题 · 答案顺序不限" : (question.multiple ? "多选题 · 选完提交" : "单选题");
    byId("submitButton").hidden = !question.multiple && question.type !== "fill";
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
    if (question.type === "fill") {
      question.answers.forEach(function (_, index) {
        var label = document.createElement("label"); label.className = "fill-label";
        label.textContent = "第 " + (index + 1) + " 空";
        var input = document.createElement("input"); input.type = "text"; input.className = "fill-input";
        input.autocomplete = "off"; input.spellcheck = false;
        input.placeholder = "输入答案，顺序不限";
        input.addEventListener("input", function () { byId("submitButton").disabled = !Array.from(options.querySelectorAll("input")).every(function (x) { return x.value.trim(); }); });
        input.addEventListener("keydown", function (event) {
          if (event.key !== "Enter" || event.isComposing) return;
          event.preventDefault();
          if (session.answered) nextQuestion();
          else if (!byId("submitButton").disabled) submitCurrent();
          else { var next = options.querySelectorAll("input")[index + 1]; if (next) next.focus(); }
        });
        label.appendChild(input); options.appendChild(label);
      });
      return;
    }
    var originalOrder = question.options.map(function (_, index) { return index; });
    session.optionOrder = shuffle(originalOrder);
    var previousOrder = lastOptionOrders[question.id] || originalOrder;
    if (session.optionOrder.length > 1 && session.optionOrder.every(function (value, index) { return value === previousOrder[index]; })) session.optionOrder.push(session.optionOrder.shift());
    lastOptionOrders[question.id] = session.optionOrder.slice();
    session.optionOrder.forEach(function (sourceIndex, index) {
      var button = document.createElement("button");
      button.className = "option-button";
      button.dataset.optionIndex = sourceIndex;
      var label = document.createElement("b");
      label.textContent = String.fromCharCode(65 + index);
      var content = document.createElement("span");
      content.textContent = optionText(question, sourceIndex);
      button.append(label, content);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () { selectOption(index); });
      options.appendChild(button);
    });
  }

  function selectOption(index) {
    if (session.intro || session.answered) return;
    var question = session.queue[session.index];
    if (question.type === "fill" || index < 0 || index >= question.options.length) return;
    var sourceIndex = session.optionOrder[index];
    if (!question.multiple) return answerQuestion([sourceIndex]);
    var position = session.selected.indexOf(sourceIndex);
    if (position < 0) session.selected.push(sourceIndex);
    else session.selected.splice(position, 1);
    var button = byId("optionsList").children[index];
    button.classList.toggle("is-selected", position < 0);
    button.setAttribute("aria-pressed", String(position < 0));
    byId("submitButton").disabled = !session.selected.length;
  }

  function submitCurrent() {
    var question = session.queue[session.index];
    var values = question.type === "fill" ? Array.from(byId("optionsList").querySelectorAll("input")).map(function (x) { return x.value.trim(); }) : session.selected;
    if (question.type === "fill" && !values.every(Boolean)) return;
    answerQuestion(values);
  }

  function answerQuestion(selectedIndices) {
    if (session.intro || session.answered) return;
    if (!selectedIndices.length) return;
    session.answered = true;
    session.selected = selectedIndices.slice();
    if (session.queue[session.index].type !== "fill") session.selected.sort();
    stopTimer();
    var question = session.queue[session.index];
    var expected = question.answers || [question.answer];
    var correct = question.type === "fill" ? window.SHIYI_FILL_UTILS.grade(question, session.selected).every(Boolean) : JSON.stringify(session.selected) === JSON.stringify(expected.slice().sort());
    if (question.type === "fill") {
      var results = window.SHIYI_FILL_UTILS.grade(question, session.selected);
      Array.from(byId("optionsList").querySelectorAll("input")).forEach(function (input, i) {
        input.readOnly = true; input.classList.add(results[i] ? "is-correct" : "is-wrong");
        input.setAttribute("aria-invalid", String(!results[i]));
      });
    }
    byId("submitButton").hidden = true;
    var durationMs = Math.max(300, Date.now() - session.startedAt);
    var buttons = Array.from(document.querySelectorAll(".option-button"));
    buttons.forEach(function (button, displayIndex) {
      var index = session.optionOrder[displayIndex];
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
    renderExplanation(question, null, session.selected, session.optionOrder);
    byId("nextButton").disabled = false;
    recordAttempt(question, correct, durationMs, session.selected.slice());
    refreshSummary();
  }

  function optionText(question, index) {
    return question.options[index].replace("以上三个都不是", "其他三个选项都不是");
  }

  function renderExplanation(question, container, selectedValues, optionOrder) {
    container = container || byId("answerExplanation");
    container.replaceChildren();
    var study = (window.SHIYI_EXPLANATIONS || {})[question.id.replace(/-[1-9]$/, "")];
    var chapter = BANK.chapters.find(function (item) { return item.id === question.chapter; });
    function paragraph(parent, className, text) {
      var element = document.createElement("p");
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
    }
    function heading(text) {
      var element = document.createElement("h2");
      element.textContent = text;
      container.appendChild(element);
    }
    var order = optionOrder || (question.options || []).map(function (_, index) { return index; });
    if (question.type === "fill") {
      heading("参考答案");
      question.answers.forEach(function (answer, index) { paragraph(container, "answer-key", "第 " + (index + 1) + " 空：" + answer); });
    } else {
      heading("参考答案");
    paragraph(container, "answer-key", "本题应选：" + question.answers.slice().sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); }).map(function (i) {
      return String.fromCharCode(65 + order.indexOf(i)) + " · " + optionText(question, i);
    }).join("；"));
    }
    if (question.reviewNotice) {
      var notice = document.createElement("aside");
      notice.className = "review-notice";
      notice.setAttribute("role", "note");
      paragraph(notice, "review-notice-title", "考试口径与核对提示：" + question.reviewNotice.policy);
      paragraph(notice, "review-notice-text", question.reviewNotice.text);
      (question.reviewNotice.sources || []).forEach(function (source) {
        var link = document.createElement("a");
        link.href = source.url; link.textContent = source.title;
        link.target = "_blank"; link.rel = "noopener noreferrer";
        notice.appendChild(link);
      });
      container.appendChild(notice);
    }
    if (question.type === "fill") {
      if (selectedValues) {
        heading("你的填写与易混辨析");
        fillFeedback(question, selectedValues).forEach(function (feedback) {
          var item = document.createElement("article");
          item.className = "fill-answer-feedback" + (feedback.correct ? " is-correct" : " is-wrong");
          paragraph(item, "fill-feedback-title", "第 " + feedback.blank + " 格：你填写“" + feedback.typed + "” · " + (feedback.correct ? "正确，已识别" : "未匹配到剩余答案"));
          if (feedback.correct && feedback.matchedBlank !== feedback.blank) paragraph(item, "fill-feedback-location", "对应参考答案第 " + feedback.matchedBlank + " 空；本题不要求填写顺序，已计为正确。");
          if (!feedback.correct) {
            if (feedback.duplicate) paragraph(item, "fill-feedback-location", "这个答案已匹配到其他填写内容，重复填写不能代替缺少的答案。");
            if (feedback.matches.length) {
              paragraph(item, "fill-feedback-location", "你写的答案在题库中对应以下考点（同一名称可能出现在多个语境）：");
              feedback.matches.forEach(function (match) {
                var location = BANK.chapters.find(function (c) { return c.id === match.chapter; });
                paragraph(item, "fill-feedback-context", location.title + " · " + match.kind + "：" + match.context);
                if (match.point) paragraph(item, "fill-feedback-point", match.point);
                paragraph(item, "question-source", "题库定位：第 " + match.chapter + " 章 · " + match.id);
              });
            } else if (!feedback.duplicate) {
              paragraph(item, "fill-feedback-unknown", "题库中暂未找到这个填写内容的可靠对应，不能确定它属于哪个概念。可先检查错别字、简称或名字是否写全。");
            }
            paragraph(item, "answer-key", "还缺少的答案：“" + feedback.answer + "”。结合下方完整句理解它与题干的对应关系。");
            if (feedback.answerContext) {
              paragraph(item, "fill-correct-point", "正确答案的相关考点：" + feedback.answerContext.point);
              paragraph(item, "question-source", "关联题号：" + feedback.answerContext.id);
            }
          }
          if (feedback.memory) paragraph(item, "fill-memory", "相关记忆提示：" + feedback.memory);
          container.appendChild(item);
        });
      }
      heading("串句理解与记忆");
      paragraph(container, "fill-complete-sentence", window.SHIYI_FILL_FEEDBACK.complete(question));
      paragraph(container, "fill-memory", question.answers.length > 1 ? "按空顺序回忆：" + question.answers.join(" → ") + "。先读完整句，再遮住答案，逐空回想；不要只记答案列表。" : "把题干中的人物、作品或观点与【" + question.answers[0] + "】成对记忆；遮住答案，用自己的话复述这句话。");
      if (question.study) {
        heading("本题考点与解题依据");
        paragraph(container, "knowledge-location", chapter.title + " · " + chapter.subtitle);
        paragraph(container, "knowledge-point", question.study.point);
        heading("逐空填写与易混点");
        question.answers.forEach(function (answer, index) {
          paragraph(container, "option-reason", "第 " + (index + 1) + " 空填写“" + answer + "”。" + ((question.aliases || [])[index] ? "也接受：" + question.aliases[index].join("、") + "。" : "") + "注意题干问的是人物、作品、概念还是年代，依据见上方考点。");
        });
      }
      heading("出处与复习定位");
      paragraph(container, "question-source", question.explanation);
      if (question.note) paragraph(container, "revision-source", question.note);
      ((question.study || {}).sources || []).forEach(function (source) {
        var row = document.createElement("p");
        var link = document.createElement("a");
        link.textContent = source.title;
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        row.append(link, document.createTextNode("：" + source.scope));
        container.appendChild(row);
      });
      return;
    }
    if (!study) {
      paragraph(container, "question-source", question.explanation);
      return;
    }
    function currentLetters(text) {
      return String(text).replace(/[A-Za-z]+/g, function (token) { var position = /^[A-G]$/.test(token) ? order.indexOf(token.charCodeAt(0) - 65) : -1; return position >= 0 ? String.fromCharCode(65 + position) : token; });
    }
    heading("本题考点与解题依据");
    paragraph(container, "knowledge-location", chapter.title + " · " + chapter.subtitle + (question.source.part ? " · 当前填写第" + question.source.part + "空" : ""));
    paragraph(container, "knowledge-point", currentLetters(study.point));
    heading("逐项辨析 · 答对也要看易混项");
    order.forEach(function (index, displayIndex) {
      var letter = String.fromCharCode(65 + displayIndex);
      var included = question.answers.indexOf(index) !== -1;
      var item = document.createElement("article");
      item.className = "option-analysis" + (included ? " is-answer" : "");
      item.dataset.optionIndex = index;
      var title = document.createElement("h3");
      title.textContent = letter + " · " + optionText(question, index) + "（" + (included ? "应选" : "不应选") + "）";
      item.appendChild(title);
      if (!included) paragraph(item, "option-reason", "知识归属与排除理由：" + currentLetters(study.options[String.fromCharCode(65 + index)]));
      else paragraph(item, "option-reason", "属于本题应选范围，依据见上方考点。" + (question.stem.indexOf("不属于") !== -1 || question.stem.indexOf("不包括") !== -1 || question.stem.indexOf("不正确") !== -1 ? "注意这是反向设问，应选不符合条件的项。" : ""));
      container.appendChild(item);
    });
    heading("出处与复习定位");
    paragraph(container, "question-source", "原题出处：用户提供" + (question.source.document ? "《" + question.source.document + "》PDF第" : "题集第") + question.source.page + "页 · " + (question.source.kind === "m" ? "多选" : "单选") + "第" + question.source.number + "题。");
    if (question.answerRevision) paragraph(container, "revision-source", question.explanation);
    paragraph(container, "reading-source", "考点查阅：彭吉象《艺术学概论》“" + chapter.subtitle + "”章；这是复习章节定位，并非对所用原题书名或版本的认定。");
    study.sources.forEach(function (source) {
      var row = document.createElement("p");
      var link = document.createElement("a");
      link.textContent = source.title;
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      row.appendChild(link);
      row.appendChild(document.createTextNode("：" + source.scope));
      container.appendChild(row);
    });
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    summary.textContent = "出处说明";
    details.appendChild(summary);
    paragraph(details, "source-note", "选项辨析为复习归纳。原题页码只定位题目，不作为新增解析的独立文献证明；文中作品、作者和理论名称提供出处线索，外部资料仅支持链接后标明的内容。未逐项核定的原典版本、页码不编造引用。原题存在简化或歧义时，已在考点中说明。");
    container.appendChild(details);
  }

  function recordAttempt(question, correct, durationMs, selectedIndex) {
    var current = state.questionStats[question.id] || { attempts: 0, wrongCount: 0, bestMs: null };
    current.attempts += 1;
    current.wrongCount += correct ? 0 : 1;
    current.lastCorrect = correct;
    current.lastDurationMs = durationMs;
    current.bestMs = current.bestMs === null ? durationMs : Math.min(current.bestMs, durationMs);
    current.lastAt = new Date().toISOString();
    if (!correct) {
      current.review = { step: 0, due: todayKey(), passedDay: null };
      if (session.mode === "review" && !session.queue.slice(session.index + 1).some(function (q) { return q.id === question.id; })) {
        session.queue.splice(Math.min(session.index + 4, session.queue.length), 0, question);
        byId("nextButton").textContent = "稍后再练 · 下一题";
      }
    } else if (session.mode === "review" && current.review && current.review.due <= todayKey() && current.review.passedDay !== todayKey()) {
      var days = REVIEW_DAYS[Math.min(current.review.step, REVIEW_DAYS.length - 1)];
      current.review.step = Math.min(current.review.step + 1, REVIEW_DAYS.length);
      current.review.due = todayKey(new Date(Date.parse(todayKey() + "T12:00:00+08:00") + days * 86400000));
      current.review.passedDay = todayKey();
    }
    if (session.mode === "review") {
      var reviewNote = document.createElement("p");
      reviewNote.className = "review-feedback";
      reviewNote.textContent = correct ? "本轮已答对 · 下次复习 " + current.review.due.replace(/-/g, "/") : "本题稍后再次出现，答对后进入间隔复习。";
      byId("answerExplanation").appendChild(reviewNote);
    }
    state.questionStats[question.id] = current;
    addDailyAnswer(todayKey(), correct);
    addDailyQuestion(todayKey(), question.id);
    state.attempts.unshift({ questionId: question.id, chapter: question.chapter, correct: correct, durationMs: durationMs, selectedIndex: selectedIndex, at: new Date().toISOString() });
    state.attempts = state.attempts.slice(0, 500);
    saveState();
  }

  function nextQuestion() {
    if (session.intro || !session.answered) return;
    if (session.index >= session.queue.length - 1) {
      showToast(session.mode === "review" ? "本轮错题已全部答对，下次到期再见" : "本组完成，记录已保存");
      setView(session.mode === "review" ? "mistakes" : "overview");
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

  function questionKind(question) {
    return question.type === "fill" ? "fill" : (question.multiple ? "multiple" : "single");
  }

  function startReview(kind, customQuestions) {
    if (kind === "terms") return window.SHIYI_TERMS.startReview();
    var all = customQuestions || mistakeQuestions(kind);
    var due = all.filter(function (q) { return state.questionStats[q.id].review.due <= todayKey(); });
    if (!all.length) return showToast("这一类还没有错题");
    session.queue = (customQuestions || (due.length ? due : all)).slice();
    session.index = 0;
    session.mode = "review";
    beginQuestion();
  }

  function mistakeQuestions(kind) {
    return BANK.questions.filter(function (question) {
      return (!kind || questionKind(question) === kind) && state.questionStats[question.id] && state.questionStats[question.id].wrongCount > 0;
    }).sort(function (a, b) {
      return state.questionStats[a.id].review.due.localeCompare(state.questionStats[b.id].review.due) || state.questionStats[b.id].wrongCount - state.questionStats[a.id].wrongCount;
    });
  }

  function renderMistakes() {
    var questions = mistakeQuestions();
    var dueCount = questions.filter(function (q) { return state.questionStats[q.id].review.due <= todayKey(); }).length;
    byId("mistakeSummary").textContent = "选择与填空待复习 " + dueCount + " 题 · 名词到期 " + window.SHIYI_TERMS.reviewSummary().due + " 项 · 累计错题 " + questions.length + " 题";
    document.querySelectorAll("[data-review-kind]").forEach(function (button) {
      if (button.dataset.reviewKind === "terms") {
        var summary = window.SHIYI_TERMS.reviewSummary();
        button.querySelector("strong").textContent = summary.due;
        button.querySelector("small").textContent = summary.studied ? "已评分 " + summary.studied + " 项 · 按颜色周期复习" : "先到章节中抽背并自评";
        button.querySelector(".review-next").textContent = summary.next ? "下次到期 " + summary.next.replace(/-/g,"/") : "";
        button.disabled = !summary.studied; return;
      }
      var rows = mistakeQuestions(button.dataset.reviewKind);
      var due = rows.filter(function (q) { return state.questionStats[q.id].review.due <= todayKey(); }).length;
      button.querySelector("strong").textContent = due;
      button.querySelector("small").textContent = rows.length ? "累计 " + rows.length + " 题 · " + (due ? "点击开始复习" : "今日已完成，可自由巩固") : "还没有错题";
      button.disabled = !rows.length;
      var next = rows.filter(function (q) { return state.questionStats[q.id].review.due > todayKey(); })[0];
      button.querySelector(".review-next").textContent = next ? "下次到期 " + state.questionStats[next.id].review.due.replace(/-/g, "/") : "";
    });
    document.querySelectorAll("[data-mistake-kind]").forEach(function (button) {
      button.querySelector("span").textContent = questions.filter(function (q) { return (q.type === "fill") === (button.dataset.mistakeKind === "fill"); }).length;
    });
    renderMistakeList();
  }

  function renderMistakeList() {
    var list = byId("mistakeList");
    var tokens = mistakeBrowse.query.trim().split(/\s+/).map(window.SHIYI_FILL_UTILS.normalize).filter(Boolean);
    var questions = mistakeQuestions().filter(function (q) {
      var stat = state.questionStats[q.id];
      var study = q.type === "fill" ? q.study : (window.SHIYI_EXPLANATIONS || {})[q.id.replace(/-[1-9]$/, "")];
      var text = window.SHIYI_FILL_UTILS.normalize([q.id, q.stem, (q.options || []).join(" "), q.type === "fill" ? q.answers.join(" ") : "", JSON.stringify(study || {})].join(" "));
      return (q.type === "fill") === (mistakeBrowse.kind === "fill") &&
        (mistakeBrowse.chapter === "all" || q.chapter === Number(mistakeBrowse.chapter)) &&
        (mistakeBrowse.kind === "fill" || mistakeBrowse.subtype === "all" || questionKind(q) === mistakeBrowse.subtype) &&
        (mistakeBrowse.status === "all" || (stat.review.due <= todayKey()) === (mistakeBrowse.status === "due")) &&
        stat.wrongCount >= mistakeBrowse.wrong && tokens.every(function (token) { return text.indexOf(token) !== -1; });
    });
    questions.sort(function (a, b) {
      var sa = state.questionStats[a.id], sb = state.questionStats[b.id];
      if (mistakeBrowse.sort === "chapter") return a.chapter - b.chapter || a.id.localeCompare(b.id, undefined, { numeric: true });
      if (mistakeBrowse.sort === "recent") return (sb.lastAt || "").localeCompare(sa.lastAt || "") || sb.wrongCount - sa.wrongCount;
      if (mistakeBrowse.sort === "due") return sa.review.due.localeCompare(sb.review.due) || sb.wrongCount - sa.wrongCount;
      return sb.wrongCount - sa.wrongCount || a.chapter - b.chapter;
    });
    filteredMistakes = questions;
    var pageCount = Math.max(1, Math.ceil(questions.length / 20));
    mistakeBrowse.page = Math.min(mistakeBrowse.page, pageCount);
    var start = (mistakeBrowse.page - 1) * 20;
    byId("mistakeResultCount").textContent = questions.length ? "找到 " + questions.length + " 道 · 显示 " + (start + 1) + "–" + Math.min(start + 20, questions.length) + " 道" : "没有符合条件的错题";
    byId("mistakePage").textContent = mistakeBrowse.page + " / " + pageCount;
    byId("mistakePrevious").disabled = mistakeBrowse.page === 1;
    byId("mistakeNext").disabled = mistakeBrowse.page === pageCount;
    document.querySelector(".mistake-pagination").hidden = questions.length <= 20;
    byId("reviewFiltered").disabled = !questions.length;
    byId("mistakeSubtypeLabel").hidden = mistakeBrowse.kind === "fill";
    document.querySelectorAll("[data-mistake-kind]").forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.mistakeKind === mistakeBrowse.kind)); });
    if (!questions.length) {
      list.innerHTML = "<div class=\"empty-state\"><div><strong>这里没有符合条件的错题</strong><span>试试其他分类、单元或关键词，也可以重置筛选。</span></div></div>";
      return;
    }
    list.innerHTML = "";
    var lastChapter = null;
    questions.slice(start, start + 20).forEach(function (question, index) {
      var stat = state.questionStats[question.id];
      var chapter = BANK.chapters.find(function (c) { return c.id === question.chapter; });
      if (mistakeBrowse.sort === "chapter" && lastChapter !== question.chapter) {
        var heading = document.createElement("h2"); heading.className = "mistake-unit-heading";
        heading.textContent = chapter.title + " · " + chapter.subtitle; list.appendChild(heading); lastChapter = question.chapter;
      }
      var row = document.createElement("article");
      row.className = "mistake-row";
      row.innerHTML = "<div class=\"mistake-meta\"><span class=\"unit-label\"></span><span class=\"mistake-kind\"></span><strong>累计错 " + stat.wrongCount + " 次</strong></div><div class=\"mistake-content\"><h3><button class=\"mistake-toggle\" type=\"button\" aria-expanded=\"false\"><span class=\"mistake-stem\"></span><span class=\"toggle-hint\">查看解析</span></button></h3></div><div class=\"mistake-row-footer\"><span class=\"mistake-due\"></span><button class=\"retry-question\">重练本题</button></div>";
      row.dataset.questionId = question.id;
      row.querySelector(".unit-label").textContent = chapter.title + " · " + chapter.subtitle;
      row.querySelector(".mistake-kind").textContent = ({single:"单选题", multiple:"多选题", fill:"填空题"})[questionKind(question)];
      row.querySelector(".mistake-due").textContent = (stat.review.due <= todayKey() ? "待复习 · " : "下次复习 · ") + stat.review.due.replace(/-/g, "/");
      row.querySelector(".mistake-stem").textContent = (start + index + 1) + ". " + question.stem;
      var explanation = document.createElement("div");
      explanation.id = "mistake-explanation-" + question.id;
      explanation.className = "answer-panel is-wrong mistake-explanation";
      explanation.hidden = true;
      var toggle = row.querySelector(".mistake-toggle");
      toggle.setAttribute("aria-controls", explanation.id);
      toggle.addEventListener("click", function () {
        if (!explanation.hasChildNodes()) renderExplanation(question, explanation);
        explanation.hidden = !explanation.hidden;
        toggle.setAttribute("aria-expanded", String(!explanation.hidden));
        toggle.querySelector(".toggle-hint").textContent = explanation.hidden ? "查看解析" : "收起解析";
      });
      row.appendChild(explanation);
      row.querySelector(".retry-question").addEventListener("click", function () { startReview(questionKind(question), [question]); });
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
      var ms = state.dailyStudyMs[key] || 0;
      box.className = "calendar-day" + (key === today ? " is-today" : "") + (future ? " is-future" : "") + (!future && ms < 60000 ? " is-under-minute" : "");
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
    summaryDay = today;
    var todayAttempts = state.attempts.filter(function (attempt) { return Boolean(getQuestion(attempt.questionId)) && todayKey(new Date(attempt.at)) === today; });
    var counts = state.dailyAnswers[today] || { correct: 0, wrong: 0 };
    var total = counts.correct + counts.wrong;
    var distinct = (state.dailyQuestionIds[today] || []).filter(function (id) { return Boolean(getQuestion(id)); }).length;
    var estimated = (state.dailyQuestionIdsEstimated || []).indexOf(today) !== -1;
    var average = todayAttempts.length ? todayAttempts.reduce(function (sum, a) { return sum + a.durationMs; }, 0) / todayAttempts.length : null;
    byId("todayDone").textContent = total;
    byId("todayDistinct").textContent = (estimated ? "≥ " : "") + distinct;
    byId("todayDistinct").title = estimated ? "旧记录有截断，已从现存记录补算；不重复题数可能不完整。" : "同一道题今天重复刷，只算一道。";
    byId("todayAccuracy").textContent = total ? Math.round(counts.correct / total * 100) + "%" : "—";
    byId("todaySpeed").textContent = formatSeconds(average);
    byId("todayMistakes").textContent = mistakeQuestions().length;
    byId("mistakeNavCount").textContent = mistakeQuestions().length;
    byId("progressRing").style.setProperty("--percent", Math.min(100, total / (state.dailyGoal || 20) * 100));
    var learned = new Set(state.attempts.map(function (attempt) { return attempt.questionId; }));
    Object.keys(state.questionStats).forEach(function (id) { if (state.questionStats[id].attempts > 0) learned.add(id); });
    var learnedCount = BANK.questions.filter(function (q) { return learned.has(q.id); }).length;
    byId("bankStatus").textContent = learnedCount + " / " + BANK.questions.length;
    byId("bankStatus").title = "已学 / 总题量（提交过答案即计为已学，重复作答不重复计数）";
    byId("bankStatus").setAttribute("aria-label", "已学 " + learnedCount + " 题 / 共 " + BANK.questions.length + " 题");
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
    byId("unitTrigger").addEventListener("click", function () {
      if (byId("unitPanel").classList.contains("is-open")) closeUnitPanel(); else openUnitPanel();
    });
    byId("openUnitsButton").addEventListener("click", openUnitPanel);
    byId("closeUnitPanel").addEventListener("click", closeUnitPanel);
    byId("panelBackdrop").addEventListener("click", closeUnitPanel);
    byId("continueButton").addEventListener("click", openUnitPanel);
    byId("enterStageButton").addEventListener("click", function () { if (session.intro) beginQuestion(true); });
    byId("nextButton").addEventListener("click", nextQuestion);
    byId("submitButton").addEventListener("click", submitCurrent);
    byId("favoriteButton").addEventListener("click", toggleFavorite);
    document.querySelectorAll("[data-review-kind]").forEach(function (button) {
      button.addEventListener("click", function () { startReview(button.dataset.reviewKind); });
    });
    BANK.chapters.forEach(function (chapter) {
      var option = document.createElement("option"); option.value = chapter.id;
      option.textContent = chapter.title + " · " + chapter.subtitle; byId("mistakeChapter").appendChild(option);
    });
    document.querySelectorAll("[data-mistake-view]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.dataset.mistakeView === "terms") return showTermLibrary();
        byId("termLibrary").hidden = true;
        var browse = button.dataset.mistakeView === "browse";
        byId("mistakeLibrary").hidden = !browse; byId("reviewDashboard").hidden = browse;
        document.querySelectorAll("[data-mistake-view]").forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); });
      });
    });
    document.querySelectorAll("[data-mistake-kind]").forEach(function (button) {
      button.addEventListener("click", function () { mistakeBrowse.kind = button.dataset.mistakeKind; mistakeBrowse.page = 1; renderMistakeList(); });
    });
    byId("mistakeFilters").addEventListener("submit", function (event) { event.preventDefault(); });
    byId("mistakeSearch").addEventListener("input", function () { mistakeBrowse.query = this.value; mistakeBrowse.page = 1; renderMistakeList(); });
    [["mistakeChapter", "chapter"], ["mistakeSubtype", "subtype"], ["mistakeStatus", "status"], ["mistakeWrong", "wrong"], ["mistakeSort", "sort"]].forEach(function (pair) {
      byId(pair[0]).addEventListener("change", function () { mistakeBrowse[pair[1]] = pair[1] === "wrong" ? Number(this.value) : this.value; mistakeBrowse.page = 1; renderMistakeList(); });
    });
    byId("clearMistakeFilters").addEventListener("click", function () {
      var kind = mistakeBrowse.kind; byId("mistakeFilters").reset();
      mistakeBrowse = { kind: kind, chapter: "all", subtype: "all", status: "all", wrong: 0, sort: "wrong", query: "", page: 1 }; renderMistakeList();
    });
    byId("reviewFiltered").addEventListener("click", function () { startReview(null, filteredMistakes); });
    [["mistakePrevious", -1], ["mistakeNext", 1]].forEach(function (pair) {
      byId(pair[0]).addEventListener("click", function () { mistakeBrowse.page += pair[1]; renderMistakeList(); byId("mistakeResultCount").scrollIntoView({ block: "nearest" }); });
    });
    document.addEventListener("keydown", function (event) {
      if (!views.practice.classList.contains("is-visible")) return;
      if (session.intro) {
        if (event.key === "Tab") event.preventDefault();
        return;
      }
      if (event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.key >= "1" && event.key <= "9" && !session.answered) selectOption(Number(event.key) - 1);
      if (event.key === "Enter") {
        if (!session.answered && event.target.classList.contains("option-button")) return;
        event.preventDefault();
        if (session.answered) nextQuestion();
        else if (session.queue[session.index].multiple || session.queue[session.index].type === "fill") submitCurrent();
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
    byId("bankSummary").textContent = "填空题 " + window.SHIYI_FILL_BANK.questions.length + " 道（按题逐空填写） · 另有 " + window.SHIYI_FILL_BANK.pending.length + " 项待核对；选择题已保留 " + BANK.sourceQuestionCount + " 道原题 · " + BANK.gradedSourceCount + " 道进入判分 · 多空题逐空练习";
    byId("auditSummary").textContent = "题库核对说明 · " + (BANK.pending.length + window.SHIYI_FILL_BANK.pending.length) + " 项待核对（不参与判分）";
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
    window.SHIYI_FILL_BANK.pending.forEach(function (q) {
      var item = document.createElement("article");
      var title = document.createElement("strong"); title.textContent = "第" + q.chapter + "章 · 填空第" + q.number + "题 · PDF第" + q.page + "页";
      var stem = document.createElement("p"); stem.textContent = q.stem;
      var reason = document.createElement("p"); reason.textContent = q.reason;
      var key = document.createElement("p"); key.textContent = "后附参考答案（未采用）：" + q.originalKey;
      item.append(title, stem, reason, key); byId("pendingQuestions").appendChild(item);
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

  function renderPlan() {
    byId("dailyGoal").value = state.dailyGoal || 20;
    var done = (state.dailyAnswers[todayKey()] || {correct:0, wrong:0});
    byId("planStatus").textContent = "今日已答 " + (done.correct + done.wrong) + " / " + (state.dailyGoal || 20) + " 题；计划保存在本机。";
  }

  function downloadJSON(value, name) {
    var blob = new Blob([JSON.stringify(value, null, 2)], {type:"application/json;charset=utf-8"});
    var url = URL.createObjectURL(blob); var link = document.createElement("a");
    link.href = url; link.download = name + "-" + todayKey() + ".json"; link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  [["choiceMixButton","choice"],["fillMixButton","fill"],["termMixButton","terms"]].forEach(function (pair) { byId(pair[0]).addEventListener("click",function () { openMix(pair[1]); }); });
  document.querySelectorAll("[data-mix-range]").forEach(function (button) { button.addEventListener("click",function () { startMix(button.dataset.mixRange); }); });
  byId("closeMixScope").addEventListener("click",function () { byId("mixScope").close(); });
  byId("savePlan").addEventListener("click", function () {
    var goal = Number(byId("dailyGoal").value);
    if (!Number.isInteger(goal) || goal < 1 || goal > 10000) return showToast("请输入 1–10000 的整数");
    state.dailyGoal = goal; saveState(); renderPlan(); refreshSummary(); showToast("计划已保存");
  });
  byId("backupAll").addEventListener("click", function () {
    flushStudyTime(); downloadJSON({format:"shiyi-backup",version:1,exportedAt:new Date().toISOString(),state:state,terms:window.SHIYI_TERMS.exportData(),banks:{choice:BANK.questions.filter(function(q){return q.type!=="fill";}),fill:window.SHIYI_FILL_BANK}}, "识艺-完整备份");
  });
  document.querySelectorAll("[data-export]").forEach(function (button) {
    button.addEventListener("click", function () {
      var kind = button.dataset.export;
      downloadJSON({format:"shiyi-question-bank",version:1,kind:kind,chapters:BANK.chapters,questions:BANK.questions.filter(function(q){return (kind === "fill" ? q.type === "fill" : q.type !== "fill");}),pending:kind === "fill" ? window.SHIYI_FILL_BANK.pending : BANK.pending}, "识艺-" + (kind === "fill" ? "填空题库" : "选择题库"));
    });
  });
  byId("restoreBackup").addEventListener("change", async function () {
    var file = this.files[0]; if (!file) return;
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error("备份文件过大");
      var data = JSON.parse(await file.text());
      window.SHIYI_FILL_UTILS.validateBackup(data, BANK.questions);
      if (data.terms !== undefined) window.SHIYI_TERMS.validate(data.terms);
      if (!window.confirm("恢复备份会替换本机学习记录、收藏和计划。继续前会自动下载一份当前记录备份。是否继续？")) return;
      flushStudyTime(); downloadJSON({format:"shiyi-backup",version:1,state:state,terms:window.SHIYI_TERMS.exportData()}, "识艺-恢复前备份");
      var previousTerms = window.SHIYI_TERMS.raw();
      try {
        if (data.terms !== undefined) window.SHIYI_TERMS.restore(data.terms);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.state));
      } catch (error) {
        if (previousTerms === null) localStorage.removeItem(window.SHIYI_TERMS.KEY);
        else localStorage.setItem(window.SHIYI_TERMS.KEY, previousTerms);
        throw error;
      }
      window.location.reload();
    } catch (error) { showToast("无法恢复：" + error.message); }
    finally { this.value = ""; }
  });

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
    if (summaryDay !== todayKey()) refreshSummary();
    if (views.records.classList.contains("is-visible")) renderStudyDates();
  }, 15000);
  initDate();
  renderAudit();
  bindEvents();
  refreshAll();
})();

