(function (root) {
  "use strict";
  function normalize(value) {
    return String(value).normalize("NFKC").toLowerCase().replace(/[\s《》〈〉“”‘’"'·•．。，、：:；;！!？?（）()\-—]/g, "");
  }
  function match(question, values) {
    var accepted = question.answers.map(function (answer, index) { return [answer].concat((question.aliases || [])[index] || []).map(normalize); });
    var owners = question.answers.map(function () { return -1; });
    var keys = question.answers.map(function (_, input) { return normalize(values[input] || ""); });
    function assign(input, visited) {
      var order = [input].concat(question.answers.map(function (_, i) { return i; }).filter(function (i) { return i !== input; }));
      return order.some(function (answer) {
        if (visited[answer] || !keys[input] || accepted[answer].indexOf(keys[input]) === -1) return false;
        visited[answer] = true;
        if (owners[answer] === -1 || assign(owners[answer], visited)) { owners[answer] = input; return true; }
        return false;
      });
    }
    keys.forEach(function (_, input) { assign(input, []); });
    return keys.map(function (_, input) { return owners.indexOf(input); });
  }
  function grade(question, values) {
    return match(question, values).map(function (answer) { return answer !== -1; });
  }
  function validateBackup(data, questions) {
    function fail() { throw new Error("文件不是有效的识艺学习备份"); }
    function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
    function count(value) { return Number.isFinite(value) && value >= 0; }
    if (!object(data) || data.format !== "shiyi-backup" || data.version !== 1 || !object(data.state)) fail();
    var state = data.state;
    if (!Array.isArray(state.attempts) || !object(state.questionStats) || !Array.isArray(state.favorites)) fail();
    var ids = new Set(questions.map(function(q) { return q.id; }));
    if (!state.favorites.every(function(id) { return typeof id === "string" && ids.has(id); })) fail();
    state.attempts.forEach(function(a) {
      if (!object(a) || !ids.has(a.questionId) || !Number.isInteger(a.chapter) || a.chapter < 1 || a.chapter > 12 || typeof a.correct !== "boolean" || !count(a.durationMs) || !Number.isFinite(Date.parse(a.at))) fail();
    });
    Object.keys(state.questionStats).forEach(function(id) {
      var s = state.questionStats[id];
      if (!ids.has(id) || !object(s) || !Number.isInteger(s.attempts) || s.attempts < 1 || !Number.isInteger(s.wrongCount) || s.wrongCount < 0 || s.wrongCount > s.attempts || typeof s.lastCorrect !== "boolean" || !count(s.lastDurationMs) || !(s.bestMs === null || count(s.bestMs))) fail();
      if (s.review !== undefined) {
        var r = s.review;
        function validDay(day) { return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day; }
        if (!object(r) || !Number.isInteger(r.step) || r.step < 0 || r.step > 7 || !validDay(r.due) || !(r.passedDay === null || validDay(r.passedDay))) fail();
      }
    });
    ["dailyStudyMs", "dailyAnswers"].forEach(function(field) {
      if (state[field] === undefined) return;
      if (!object(state[field])) fail();
      Object.keys(state[field]).forEach(function(day) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail();
        var value = state[field][day];
        if (field === "dailyStudyMs" ? !count(value) : !object(value) || !Number.isInteger(value.correct) || value.correct < 0 || !Number.isInteger(value.wrong) || value.wrong < 0) fail();
      });
    });
    if (state.dailyGoal !== undefined && (!Number.isInteger(state.dailyGoal) || state.dailyGoal < 1 || state.dailyGoal > 10000)) fail();
    function dayKey(day) { return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day; }
    if (state.dailyQuestionIds !== undefined) {
      if (!object(state.dailyQuestionIds)) fail();
      Object.keys(state.dailyQuestionIds).forEach(function (day) {
        var rows = state.dailyQuestionIds[day];
        if (!dayKey(day) || !Array.isArray(rows) || new Set(rows).size !== rows.length || !rows.every(function (id) { return typeof id === "string" && ids.has(id); })) fail();
      });
    }
    if (state.dailyQuestionIdsEstimated !== undefined && (!Array.isArray(state.dailyQuestionIdsEstimated) || !state.dailyQuestionIdsEstimated.every(dayKey))) fail();
    return true;
  }
  root.SHIYI_FILL_UTILS = {normalize:normalize, match:match, grade:grade, validateBackup:validateBackup};
})(typeof window === "undefined" ? globalThis : window);
