/* Teacherer – local-first report comment tool.
 * All state lives in localStorage; nothing is sent anywhere.
 */
(function () {
  "use strict";

  var APP_VERSION = "1.0.0";
  var STORAGE_KEY = "teacherer-state-v1";
  var LEVELS = ["1", "2", "3", "4"];

  var PRONOUN_PRESETS = {
    she: { subject: "she", object: "her", possessive: "her" },
    he: { subject: "he", object: "him", possessive: "his" },
    they: { subject: "they", object: "them", possessive: "their" }
  };

  var state = null;
  var selectedStudentId = null;
  var saveTimer = null;

  /* ---------------- utilities ---------------- */

  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] === true) node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function $(sel) { return document.querySelector(sel); }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function downloadBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  function copyText(text, confirmEl) {
    function done() {
      if (!confirmEl) return;
      confirmEl.hidden = false;
      setTimeout(function () { confirmEl.hidden = true; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else {
      legacyCopy(text);
      done();
    }
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* best effort */ }
    ta.remove();
  }

  function todayStamp() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ---------------- state ---------------- */

  function freshStateFromSeed() {
    var seed = window.TEACHERER_SEED || { categories: [], students: [] };
    var s = { version: 1, categories: [], students: [] };
    var idByName = {};
    seed.categories.forEach(function (c) {
      var id = uid();
      idByName[c.name] = id;
      s.categories.push({
        id: id,
        name: c.name,
        include: !!c.include,
        levelLabels: c.levelLabels ? Object.assign({}, c.levelLabels) : null,
        levels: {
          "1": c.levels["1"] || "",
          "2": c.levels["2"] || "",
          "3": c.levels["3"] || "",
          "4": c.levels["4"] || ""
        }
      });
    });
    (seed.students || []).forEach(function (st) {
      var ratings = {};
      Object.keys(st.ratings || {}).forEach(function (name) {
        if (idByName[name]) ratings[idByName[name]] = String(st.ratings[name]);
      });
      s.students.push(makeStudent(st.name, st.pronouns || "they", ratings));
    });
    return s;
  }

  function makeStudent(name, preset, ratings) {
    var p = PRONOUN_PRESETS[preset] || PRONOUN_PRESETS.they;
    return {
      id: uid(),
      name: name || "",
      pronouns: {
        preset: PRONOUN_PRESETS[preset] ? preset : "custom",
        subject: p.subject,
        object: p.object,
        possessive: p.possessive
      },
      ratings: ratings || {},
      note: ""
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && Array.isArray(parsed.categories) && Array.isArray(parsed.students)) {
          return parsed;
        }
      }
    } catch (e) { /* corrupted or unavailable -> reseed */ }
    return freshStateFromSeed();
  }

  function saveState() {
    var status = $("#save-status");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        status.textContent = "Saved locally";
      } catch (e) {
        status.textContent = "⚠ Could not save (storage full?)";
      }
    }, 150);
    status.textContent = "Saving…";
  }

  /* ---------------- comment generation ---------------- */

  function substitutePlaceholders(text, student) {
    var displayName = (student.name || "").trim() || "This student";
    var p = student.pronouns;
    return text
      .split("[Student]").join(displayName)
      .split("[He/She/They]").join(capitalize(p.subject))
      .split("[he/she/they]").join(p.subject)
      // The original spreadsheet substitutes the capitalised possessive token
      // with the lowercase pronoun; keep that behaviour.
      .split("[His/Her/Their]").join(p.possessive)
      .split("[his/her/their]").join(p.possessive)
      .split("[Him/Her/Them]").join(capitalize(p.object))
      .split("[him/her/them]").join(p.object);
  }

  function generateComment(student) {
    var parts = [];
    state.categories.forEach(function (cat) {
      if (!cat.include) return;
      var lvl = student.ratings[cat.id];
      if (!lvl) return;
      var text = (cat.levels[lvl] || "").trim();
      if (text) parts.push(text);
    });
    var note = (student.note || "").trim();
    if (note) parts.push(note);
    return substitutePlaceholders(parts.join(" "), student);
  }

  /* ---------------- tabs ---------------- */

  function initTabs() {
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (b) {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        document.querySelectorAll(".panel").forEach(function (p) {
          p.classList.toggle("active", p.id === "panel-" + btn.dataset.tab);
        });
      });
    });
  }

  /* ---------------- students panel ---------------- */

  function renderStudentList() {
    var list = $("#student-list");
    list.textContent = "";
    state.students.forEach(function (st) {
      var li = el("li", {
        class: st.id === selectedStudentId ? "selected" : "",
        onclick: function () { selectStudent(st.id); }
      }, [
        el("span", { text: st.name || "(unnamed)" }),
        el("span", { class: "badge", text: st.pronouns.subject })
      ]);
      list.appendChild(li);
    });
  }

  function selectStudent(id) {
    selectedStudentId = id;
    renderStudentList();
    renderStudentEditor();
  }

  function currentStudent() {
    return state.students.find(function (s) { return s.id === selectedStudentId; }) || null;
  }

  function renderStudentEditor() {
    var st = currentStudent();
    $("#no-student-note").hidden = !!st;
    $("#student-form").hidden = !st;
    if (!st) return;

    $("#student-name").value = st.name;
    $("#student-pronouns").value = st.pronouns.preset;
    $("#custom-pronouns").hidden = st.pronouns.preset !== "custom";
    $("#pr-subject").value = st.pronouns.subject;
    $("#pr-object").value = st.pronouns.object;
    $("#pr-possessive").value = st.pronouns.possessive;
    $("#student-note").value = st.note || "";

    var grid = $("#rating-grid");
    grid.textContent = "";
    state.categories.forEach(function (cat) {
      var select = el("select", {
        onchange: function () {
          if (select.value) st.ratings[cat.id] = select.value;
          else delete st.ratings[cat.id];
          onStateChanged({ keepEditor: true });
        }
      });
      select.appendChild(el("option", { value: "", text: "—" }));
      LEVELS.forEach(function (lvl) {
        var label = cat.levelLabels && cat.levelLabels[lvl]
          ? lvl + " · " + cat.levelLabels[lvl]
          : "Level " + lvl;
        select.appendChild(el("option", { value: lvl, text: label }));
      });
      select.value = st.ratings[cat.id] || "";
      grid.appendChild(el("div", { class: "rating-cell" + (cat.include ? "" : " excluded") }, [
        el("span", { class: "cat-name", text: (cat.include ? "" : "✎ ") + cat.name }),
        select
      ]));
    });

    renderStudentPreview();
  }

  function renderStudentPreview() {
    var st = currentStudent();
    if (!st) return;
    $("#student-preview").textContent = generateComment(st);
  }

  function initStudentPanel() {
    $("#add-student").addEventListener("click", function () {
      var st = makeStudent("", "they", {});
      state.students.push(st);
      selectedStudentId = st.id;
      onStateChanged();
      $("#student-name").focus();
    });

    $("#delete-student").addEventListener("click", function () {
      var st = currentStudent();
      if (!st) return;
      if (!confirm("Remove " + (st.name || "this student") + " and their ratings?")) return;
      state.students = state.students.filter(function (s) { return s.id !== st.id; });
      selectedStudentId = state.students.length ? state.students[0].id : null;
      onStateChanged();
    });

    $("#student-name").addEventListener("input", function () {
      var st = currentStudent();
      if (!st) return;
      st.name = this.value;
      renderStudentList();
      renderStudentPreview();
      saveState();
      renderReports();
    });

    $("#student-pronouns").addEventListener("change", function () {
      var st = currentStudent();
      if (!st) return;
      var preset = this.value;
      st.pronouns.preset = preset;
      if (PRONOUN_PRESETS[preset]) {
        st.pronouns.subject = PRONOUN_PRESETS[preset].subject;
        st.pronouns.object = PRONOUN_PRESETS[preset].object;
        st.pronouns.possessive = PRONOUN_PRESETS[preset].possessive;
      }
      onStateChanged({ keepEditor: true });
    });

    ["pr-subject", "pr-object", "pr-possessive"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () {
        var st = currentStudent();
        if (!st) return;
        st.pronouns.subject = $("#pr-subject").value.trim() || "they";
        st.pronouns.object = $("#pr-object").value.trim() || "them";
        st.pronouns.possessive = $("#pr-possessive").value.trim() || "their";
        renderStudentPreview();
        saveState();
        renderReports();
      });
    });

    $("#student-note").addEventListener("input", function () {
      var st = currentStudent();
      if (!st) return;
      st.note = this.value;
      renderStudentPreview();
      saveState();
      renderReports();
    });

    $("#copy-preview").addEventListener("click", function () {
      var st = currentStudent();
      if (!st) return;
      copyText(generateComment(st), $("#copy-confirm"));
    });
  }

  /* ---------------- comment bank panel ---------------- */

  function renderBank() {
    var wrap = $("#bank-list");
    wrap.textContent = "";
    state.categories.forEach(function (cat, idx) {
      var head = el("div", { class: "bank-cat-head" });

      var includeBox = el("input", {
        type: "checkbox",
        onchange: function () { cat.include = includeBox.checked; onStateChanged({ keepEditor: true }); }
      });
      includeBox.checked = cat.include;

      var nameInput = el("input", {
        type: "text",
        value: cat.name,
        oninput: function () { cat.name = nameInput.value; saveState(); }
      });

      head.appendChild(el("label", { class: "include-toggle" }, [includeBox, el("span", { text: "in final comment" })]));
      head.appendChild(nameInput);
      head.appendChild(el("button", {
        class: "btn", title: "Move up", text: "↑",
        onclick: function () { moveCategory(idx, -1); }
      }));
      head.appendChild(el("button", {
        class: "btn", title: "Move down", text: "↓",
        onclick: function () { moveCategory(idx, 1); }
      }));
      head.appendChild(el("button", {
        class: "btn danger", text: "Delete",
        onclick: function () {
          if (!confirm("Delete category “" + cat.name + "”? Student ratings for it will be removed too.")) return;
          state.categories.splice(idx, 1);
          state.students.forEach(function (st) { delete st.ratings[cat.id]; });
          onStateChanged();
        }
      }));

      var levels = el("div", { class: "bank-levels" });
      LEVELS.forEach(function (lvl) {
        var labelInput = el("input", {
          type: "text",
          placeholder: "label (optional)",
          value: (cat.levelLabels && cat.levelLabels[lvl]) || "",
          oninput: function () {
            if (!cat.levelLabels) cat.levelLabels = {};
            cat.levelLabels[lvl] = labelInput.value;
            saveState();
          }
        });
        var ta = el("textarea", {
          rows: "4",
          placeholder: "Comment text for level " + lvl + "…",
          oninput: function () {
            cat.levels[lvl] = ta.value;
            saveState();
            renderStudentPreview();
            renderReports();
          }
        });
        ta.value = cat.levels[lvl] || "";
        levels.appendChild(el("div", { class: "bank-level" }, [
          el("div", { class: "lvl-head" }, [el("strong", { text: "Level " + lvl }), labelInput]),
          ta
        ]));
      });

      wrap.appendChild(el("div", { class: "bank-cat" }, [head, levels]));
    });
  }

  function moveCategory(idx, delta) {
    var to = idx + delta;
    if (to < 0 || to >= state.categories.length) return;
    var tmp = state.categories[idx];
    state.categories[idx] = state.categories[to];
    state.categories[to] = tmp;
    onStateChanged({ keepEditor: true });
  }

  function initBankPanel() {
    $("#add-category").addEventListener("click", function () {
      state.categories.push({
        id: uid(),
        name: "New category",
        include: true,
        levelLabels: null,
        levels: { "1": "", "2": "", "3": "", "4": "" }
      });
      onStateChanged();
    });
    $("#reset-bank").addEventListener("click", function () {
      if (!confirm("Replace the current comment bank with the built-in template? Students are kept, but their ratings will be cleared.")) return;
      var seeded = freshStateFromSeed();
      state.categories = seeded.categories;
      state.students.forEach(function (st) { st.ratings = {}; });
      onStateChanged();
    });
  }

  /* ---------------- reports & export panel ---------------- */

  function renderReports() {
    var wrap = $("#report-list");
    wrap.textContent = "";
    if (!state.students.length) {
      wrap.appendChild(el("p", { class: "hint", text: "No students yet — add some on the Students tab." }));
      return;
    }
    state.students.forEach(function (st) {
      var comment = generateComment(st);
      var copyBtn = el("button", {
        class: "btn", text: "Copy",
        onclick: function () { copyText(comment, null); copyBtn.textContent = "Copied ✓"; setTimeout(function () { copyBtn.textContent = "Copy"; }, 1500); }
      });
      wrap.appendChild(el("div", { class: "report-card" }, [
        el("h4", {}, [el("span", { text: st.name || "(unnamed)" }), copyBtn]),
        comment
          ? el("p", { text: comment })
          : el("p", { class: "none", text: "No ratings selected yet." })
      ]));
    });
  }

  function includedCategories() {
    return state.categories.filter(function (c) { return c.include; });
  }

  function buildWorkbook() {
    var wb = XLSX.utils.book_new();

    // Sheet 1: final comments
    var commentsRows = [["Student", "Pronouns", "Comment"]];
    state.students.forEach(function (st) {
      commentsRows.push([st.name, st.pronouns.subject + "/" + st.pronouns.object + "/" + st.pronouns.possessive, generateComment(st)]);
    });
    var wsComments = XLSX.utils.aoa_to_sheet(commentsRows);
    wsComments["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 120 }];
    XLSX.utils.book_append_sheet(wb, wsComments, "Comments");

    // Sheet 2: ratings matrix
    var header = ["Student", "Pronouns"].concat(state.categories.map(function (c) { return c.name; })).concat(["Personal note"]);
    var ratingRows = [header];
    state.students.forEach(function (st) {
      ratingRows.push(
        [st.name, st.pronouns.subject].concat(
          state.categories.map(function (c) { return st.ratings[c.id] ? Number(st.ratings[c.id]) : ""; })
        ).concat([st.note || ""])
      );
    });
    var wsRatings = XLSX.utils.aoa_to_sheet(ratingRows);
    wsRatings["!cols"] = [{ wch: 22 }, { wch: 10 }].concat(state.categories.map(function () { return { wch: 14 }; }));
    XLSX.utils.book_append_sheet(wb, wsRatings, "Ratings");

    // Sheet 3: the comment bank itself
    var bankRows = [["Category", "Included", "Level", "Label", "Text"]];
    state.categories.forEach(function (c) {
      LEVELS.forEach(function (lvl) {
        bankRows.push([c.name, c.include ? "yes" : "no", Number(lvl), (c.levelLabels && c.levelLabels[lvl]) || "", c.levels[lvl] || ""]);
      });
    });
    var wsBank = XLSX.utils.aoa_to_sheet(bankRows);
    wsBank["!cols"] = [{ wch: 28 }, { wch: 9 }, { wch: 6 }, { wch: 14 }, { wch: 120 }];
    XLSX.utils.book_append_sheet(wb, wsBank, "Comment Bank");

    return wb;
  }

  function initReportsPanel() {
    $("#export-xlsx").addEventListener("click", function () {
      XLSX.writeFile(buildWorkbook(), "report-comments-" + todayStamp() + ".xlsx");
    });

    $("#export-csv").addEventListener("click", function () {
      var rows = [["Student", "Comment"]];
      state.students.forEach(function (st) { rows.push([st.name, generateComment(st)]); });
      var csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows));
      downloadBlob(new Blob([csv], { type: "text/csv" }), "report-comments-" + todayStamp() + ".csv");
    });

    $("#copy-all").addEventListener("click", function () {
      var text = state.students.map(function (st) {
        return (st.name || "(unnamed)") + "\n" + generateComment(st);
      }).join("\n\n");
      copyText(text, null);
      var btn = $("#copy-all");
      btn.textContent = "Copied ✓";
      setTimeout(function () { btn.textContent = "Copy all comments"; }, 1500);
    });

    $("#print-reports").addEventListener("click", function () { window.print(); });

    $("#import-roster").addEventListener("change", function () {
      var file = this.files[0];
      this.value = "";
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = XLSX.read(e.target.result, { type: "array" });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          var added = 0;
          rows.forEach(function (row) {
            var name = "";
            var pron = "";
            Object.keys(row).forEach(function (k) {
              var key = k.trim().toLowerCase();
              if (!name && (key === "name" || key === "student" || key === "student name")) name = String(row[k]).trim();
              if (!pron && key.indexOf("pronoun") === 0) pron = String(row[k]).trim().toLowerCase();
            });
            if (!name) return;
            var preset = /^(she|her)/.test(pron) ? "she"
              : /^(he|him|his)/.test(pron) ? "he"
              : "they";
            state.students.push(makeStudent(name, preset, {}));
            added++;
          });
          if (!added) {
            alert("No students found. The first sheet needs a header row with a “Name” (or “Student”) column.");
            return;
          }
          if (!selectedStudentId && state.students.length) selectedStudentId = state.students[0].id;
          onStateChanged();
          alert("Imported " + added + " student" + (added === 1 ? "" : "s") + ".");
        } catch (err) {
          alert("Could not read that file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    });

    $("#export-json").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      downloadBlob(blob, "teacherer-backup-" + todayStamp() + ".json");
    });

    $("#import-json").addEventListener("change", function () {
      var file = this.files[0];
      this.value = "";
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var parsed = JSON.parse(e.target.result);
          if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.categories) || !Array.isArray(parsed.students)) {
            throw new Error("not a Teacherer backup");
          }
          if (!confirm("Replace everything currently in the app with this backup?")) return;
          state = parsed;
          selectedStudentId = state.students.length ? state.students[0].id : null;
          onStateChanged();
        } catch (err) {
          alert("Could not restore backup: " + err.message);
        }
      };
      reader.readAsText(file);
    });

    $("#wipe-data").addEventListener("click", function () {
      if (!confirm("Erase all students and comment bank changes from this device? Consider downloading a backup first.")) return;
      localStorage.removeItem(STORAGE_KEY);
      state = freshStateFromSeed();
      selectedStudentId = state.students.length ? state.students[0].id : null;
      onStateChanged();
    });
  }

  /* ---------------- orchestration ---------------- */

  function onStateChanged(opts) {
    opts = opts || {};
    if (selectedStudentId && !state.students.some(function (s) { return s.id === selectedStudentId; })) {
      selectedStudentId = state.students.length ? state.students[0].id : null;
    }
    renderStudentList();
    renderStudentEditor();
    if (!opts.keepEditor) renderBank();
    renderReports();
    saveState();
  }

  function init() {
    state = loadState();
    if (state.students.length) selectedStudentId = state.students[0].id;
    $("#app-version").textContent = "v" + APP_VERSION;

    initTabs();
    initStudentPanel();
    initBankPanel();
    initReportsPanel();

    renderStudentList();
    renderStudentEditor();
    renderBank();
    renderReports();
    saveState();

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        if (reg.active) $("#offline-badge").hidden = false;
        navigator.serviceWorker.ready.then(function () { $("#offline-badge").hidden = false; });
      }).catch(function () { /* offline support unavailable; app still works */ });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
