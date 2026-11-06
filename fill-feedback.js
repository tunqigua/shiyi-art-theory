(function (root) {
  "use strict";
  function complete(question) {
    var index = 0;
    return question.stem.replace(/____/g, function () { return "【" + question.answers[index++] + "】"; });
  }

  function create(questions, explanations) {
    var normalize = root.SHIYI_FILL_UTILS.normalize;
    var index = new Map();
    function add(term, entry) {
      var key = normalize(term);
      if (!key) return;
      if (!index.has(key)) index.set(key, []);
      var entries = index.get(key);
      if (!entries.some(function (row) { return row.id === entry.id && row.context === entry.context; })) entries.push(entry);
    }
    questions.forEach(function (q) {
      if (q.type === "fill") {
        q.answers.forEach(function (answer, blank) {
          var entry = { id: q.id, chapter: q.chapter, context: complete(q), point: q.study ? q.study.point : "", source: q.explanation, blank: blank + 1, kind: "填空考点" };
          [answer].concat((q.aliases || [])[blank] || []).forEach(function (term) { add(term, entry); });
        });
      } else {
        var study = explanations[q.id.replace(/-[1-9]$/, "")];
        q.options.forEach(function (term, option) {
          var included = q.answers.indexOf(option) !== -1;
          var note = study && study.options[String.fromCharCode(65 + option)];
          if (!included && !note) return;
          add(term, { id: q.id, chapter: q.chapter, context: q.stem, point: note || (study ? study.point : ""), source: q.explanation, kind: "选择题辨析" });
        });
      }
    });
    return function (question, values) {
      var matched = root.SHIYI_FILL_UTILS.match(question, values);
      var missing = question.answers.map(function (_, i) { return i; }).filter(function (i) { return matched.indexOf(i) === -1; });
      return question.answers.map(function (_, blank) {
        var correct = matched[blank] !== -1;
        var answer = question.answers[correct ? matched[blank] : missing.shift()];
        var typed = values[blank] || "";
        var misplaced = question.answers.map(function (_, i) {
          return i !== blank && [question.answers[i]].concat((question.aliases || [])[i] || []).some(function (a) { return normalize(a) === normalize(typed); }) ? i + 1 : null;
        }).filter(Boolean);
        var seen = new Set();
        var matches = (index.get(normalize(typed)) || []).slice().sort(function (a, b) { return Number(b.kind === "填空考点") - Number(a.kind === "填空考点"); }).filter(function (row) {
          if (row.id === question.id || seen.has(row.context)) return false;
          seen.add(row.context);
          return true;
        }).slice(0, 3);
        var memory = (index.get(normalize(answer)) || []).find(function (row) {
          return row.point && row.point.indexOf(answer) !== -1 && /口诀|配对记忆/.test(row.point);
        });
        var answerContext = (index.get(normalize(answer)) || []).find(function (row) { return row.id !== question.id && row.point; });
        var duplicate = !correct && question.answers.some(function (a, i) { return [a].concat((question.aliases || [])[i] || []).some(function (text) { return normalize(text) === normalize(typed); }); });
        return { blank: blank + 1, typed: typed, correct: correct, matchedBlank: matched[blank] + 1, answer: answer, duplicate: duplicate, misplaced: misplaced, matches: matches, answerContext: answerContext, memory: memory ? memory.point : "" };
      });
    };
  }
  root.SHIYI_FILL_FEEDBACK = { create: create, complete: complete };
})(typeof window === "undefined" ? globalThis : window);
