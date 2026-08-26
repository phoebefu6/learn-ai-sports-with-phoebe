/* sports-live.js - the shot-quality (xG) feature simulator.
   Usage:
     <div class="sportsbox" data-mode="score" data-levers=""></div>
     <div class="sportsbox" data-mode="shots" data-levers="distance,angle"></div>
   data-levers = which features start ON (comma list of: distance,angle,bodypart,pressure,keeper,reputation).
   NOTE: an empty data-levers attribute is falsy in JS, so it is parsed with === null,
   never with `attr || default` - an empty string legitimately means "no features".

   The sixth toggle, "reputation" (who took the shot), is an ANTI-lever. It raises the
   THIS-SEASON number and lowers the NEXT-SEASON number: the model learns the shooter, not
   the shot. Watch the gap between the two numbers, not either number on its own.

   Honesty rail: a teaching model with a fixed 8-shot example set and a scripted accuracy
   ladder. Real xG models are fitted on hundreds of thousands of shots. The direction and
   the size of each move are the lesson, not the decimals.
*/
(function () {
  "use strict";

  var LEVERS = [
    { key: "distance",   label: "Distance",       hint: "Metres from goal. The single strongest signal in every published shot model." },
    { key: "angle",      label: "Angle",          hint: "How much goal the shooter can actually see. Distance without angle badly overrates wide chances." },
    { key: "bodypart",   label: "Body part",      hint: "Head, weak foot, strong foot, volley. Same position, very different conversion." },
    { key: "pressure",   label: "Defender pressure", hint: "Defenders between ball and goal, and how close the nearest one is. Needs tracking data, not event data." },
    { key: "keeper",     label: "Keeper position", hint: "Set, committed, off the line, out of position. The cheapest large gain once you have tracking." },
    { key: "reputation", label: "Shooter reputation", hint: "Add who took the shot - name, market value, career conversion. Try it and watch BOTH numbers." }
  ];

  /* Scripted ladder: [thisSeason, nextSeason] accuracy in %, cumulative in lever order. */
  var LADDER = {
    "":                                          [52.0, 50.0],
    "distance":                                  [66.0, 64.0],
    "distance,angle":                            [73.0, 71.0],
    "distance,angle,bodypart":                   [77.0, 75.0],
    "distance,angle,bodypart,pressure":          [82.0, 80.0],
    "distance,angle,bodypart,pressure,keeper":   [85.0, 83.0]
  };
  var ORDER = ["distance", "angle", "bodypart", "pressure", "keeper"];
  var REP_TRAIN = 11.0;   /* reputation flatters the in-sample number */
  var REP_TEST = -6.0;    /* and costs you on data the model has not seen */

  function accuracy(on) {
    var key = ORDER.filter(function (k) { return on[k]; }).join(",");
    var base = LADDER[key];
    if (!base) {
      /* out-of-order combinations: interpolate from the count, same shape */
      var n = ORDER.filter(function (k) { return on[k]; }).length;
      base = LADDER[ORDER.slice(0, n).join(",")] || LADDER[""];
    }
    var train = base[0], test = base[1];
    if (on.reputation) { train += REP_TRAIN; test += REP_TEST; }
    return { train: Math.round(train * 10) / 10, test: Math.round(test * 10) / 10 };
  }

  /* ---------- the 8-shot example set ---------- */
  /* w = how much of this shot's true value each feature explains (sums to 1).
     fame = 1 if a famous shooter took it, which is what the anti-lever keys on. */

  var LEAGUE_AVG = 0.10;

  var SHOTS = [
    { d: "4m, central, unmarked, keeper already committed", truth: 0.76, fame: 0, scored: true,
      w: { distance: 0.45, angle: 0.10, bodypart: 0.05, pressure: 0.15, keeper: 0.25 },
      note: "Distance carries it, but the keeper being committed is a quarter of the value." },
    { d: "Header, 11m, defender touch-tight, keeper set", truth: 0.11, fame: 0, scored: false,
      w: { distance: 0.30, angle: 0.10, bodypart: 0.25, pressure: 0.25, keeper: 0.10 },
      note: "Looks like a chance on a distance-only model. Body part and pressure cut it by two thirds." },
    { d: "Left foot, 18m, tight angle, two defenders in the lane", truth: 0.04, fame: 1, scored: false,
      w: { distance: 0.30, angle: 0.35, bodypart: 0.10, pressure: 0.20, keeper: 0.05 },
      note: "Angle is the biggest single term here. Reputation makes this one worse, not better." },
    { d: "Weak-foot volley, 14m, keeper off the line", truth: 0.28, fame: 0, scored: true,
      w: { distance: 0.25, angle: 0.10, bodypart: 0.30, pressure: 0.05, keeper: 0.30 },
      note: "Two features you only get from tracking data do more than half the work." },
    { d: "Back-post header, 25m out, completely unmarked", truth: 0.19, fame: 0, scored: false,
      w: { distance: 0.40, angle: 0.15, bodypart: 0.25, pressure: 0.15, keeper: 0.05 },
      note: "Free, but far and with a head. Being unmarked is worth less than coaches think." },
    { d: "35m strike, no pressure, keeper on his line", truth: 0.03, fame: 1, scored: true,
      w: { distance: 0.60, angle: 0.15, bodypart: 0.10, pressure: 0.10, keeper: 0.05 },
      note: "It went in, and it was still a 3% shot. This is the row that breaks people, and the row the anti-lever ruins." },
    { d: "Cut-back, 9m, central, keeper stranded at the near post", truth: 0.55, fame: 1, scored: true,
      w: { distance: 0.30, angle: 0.20, bodypart: 0.05, pressure: 0.15, keeper: 0.30 },
      note: "The highest-value pattern in modern attacking play, and keeper position is why." },
    { d: "6m out but almost on the byline, defender on the line", truth: 0.13, fame: 0, scored: false,
      w: { distance: 0.20, angle: 0.45, bodypart: 0.05, pressure: 0.25, keeper: 0.05 },
      note: "Six metres from goal and a 13% chance. Distance alone would call this a huge chance." }
  ];

  function estimate(shot, on) {
    var est = LEAGUE_AVG, gap = shot.truth - LEAGUE_AVG;
    ORDER.forEach(function (k) { if (on[k]) est += gap * shot.w[k]; });
    if (on.reputation) est += shot.fame ? 0.09 : -0.02;
    if (est < 0.01) est = 0.01;
    if (est > 0.97) est = 0.97;
    return Math.round(est * 100) / 100;
  }

  /* ---------- rendering ---------- */

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function leverBar(on, onChange) {
    var bar = document.createElement("div");
    bar.className = "ag-levers";
    LEVERS.forEach(function (lv) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ag-lever" + (on[lv.key] ? " ag-on" : "");
      chip.title = lv.hint;
      chip.textContent = lv.key === "reputation" ? "⚠ " + lv.label : lv.label;
      chip.addEventListener("click", function () {
        on[lv.key] = !on[lv.key];
        chip.classList.toggle("ag-on", on[lv.key]);
        onChange();
      });
      bar.appendChild(chip);
    });
    return bar;
  }

  function parseLevers(block) {
    var attr = block.getAttribute("data-levers");
    var start = attr === null ? "distance,angle,bodypart,pressure,keeper" : attr;
    var on = { distance: false, angle: false, bodypart: false, pressure: false, keeper: false, reputation: false };
    start.split(",").forEach(function (k) { k = k.trim(); if (on.hasOwnProperty(k)) on[k] = true; });
    return on;
  }

  function honestyRail() {
    var p = document.createElement("p");
    p.className = "ag-rail";
    p.textContent = "A teaching model on a fixed 8-shot example set with a scripted accuracy ladder - real shot models are fitted on hundreds of thousands of shots and report calibration, not just accuracy. The two accuracy figures are the score; the per-shot rows show where the error sits, not a second scoreboard. The lesson is the direction and the size of each move, and above all the gap between the two numbers.";
    return p;
  }

  function wireScore(block) {
    var on = parseLevers(block);
    block.classList.add("agentbox-ready");

    var bar = document.createElement("div");
    bar.className = "sql-bar";
    bar.innerHTML = '<span class="sql-dot"></span><span class="sql-title">Shot-quality model - fitted on this season, tested on next season</span>';
    block.appendChild(bar);

    var big = document.createElement("div");
    var gapNote = document.createElement("div");
    block.appendChild(leverBar(on, render));
    block.appendChild(big);
    block.appendChild(gapNote);

    var table = document.createElement("div"); table.className = "ag-score-table";
    block.appendChild(table);
    block.appendChild(honestyRail());

    function render() {
      var a = accuracy(on);
      var gap = Math.round((a.train - a.test) * 10) / 10;
      big.className = "ag-score-big " + (on.reputation ? "ag-fail" : a.test >= 80 ? "ag-pass" : a.test >= 65 ? "ag-mid" : "ag-fail");
      big.textContent = "This season " + a.train.toFixed(1) + "%  ·  Next season " + a.test.toFixed(1) + "%";
      gapNote.className = "ag-verdict " + (gap > 6 ? "ag-fail" : "ag-pass");
      gapNote.textContent = gap > 6
        ? "Gap of " + gap.toFixed(1) + " points. The model has learned who takes the shots rather than what makes a shot good, and next season the squad changes."
        : "Gap of " + gap.toFixed(1) + " points. The model is learning the shot, not the shooter - it will still work when the squad changes.";

      table.innerHTML = "";
      SHOTS.forEach(function (s) {
        var est = estimate(s, on);
        var err = Math.abs(est - s.truth);
        var good = err <= 0.08;
        var mark = good ? "✓" : err <= 0.18 ? "◐" : "✗";
        var row = document.createElement("div");
        row.className = "ag-score-row " + (good ? "ag-row-pass" : "ag-row-fail");
        row.innerHTML =
          '<span class="ag-mark">' + mark + "</span>" +
          '<span class="ag-q">' + esc(s.d) +
          '<span class="ag-why">' + (s.scored ? "goal" : "no goal") + " · true value " + s.truth.toFixed(2) + "</span></span>" +
          '<span class="ag-out"><b>model says ' + est.toFixed(2) + "</b> - " + esc(s.note) + "</span>";
        table.appendChild(row);
      });
    }
    render();
  }

  function wireShots(block) {
    var on = parseLevers(block);
    block.classList.add("agentbox-ready");

    var bar = document.createElement("div");
    bar.className = "sql-bar";
    bar.innerHTML = '<span class="sql-dot"></span>';
    var title = document.createElement("span"); title.className = "sql-title";
    title.textContent = "One shot at a time - what each feature is worth"; bar.appendChild(title);
    var spacer = document.createElement("span"); spacer.className = "sql-spacer"; bar.appendChild(spacer);
    var counter = document.createElement("span"); counter.className = "mcp-counter"; bar.appendChild(counter);
    var backBtn = document.createElement("button");
    backBtn.type = "button"; backBtn.className = "sql-btn"; backBtn.textContent = "◀ Back"; bar.appendChild(backBtn);
    var nextBtn = document.createElement("button");
    nextBtn.type = "button"; nextBtn.className = "sql-btn sql-run"; nextBtn.textContent = "Next shot ▶"; bar.appendChild(nextBtn);
    block.appendChild(bar);

    var idx = 0;
    var big = document.createElement("div");
    block.appendChild(leverBar(on, render));
    block.appendChild(big);
    var card = document.createElement("div"); card.className = "ag-step ag-call";
    block.appendChild(card);
    var verdict = document.createElement("div");
    block.appendChild(verdict);
    block.appendChild(honestyRail());

    function render() {
      var s = SHOTS[idx], est = estimate(s, on), err = Math.abs(est - s.truth);
      counter.textContent = (idx + 1) + " / " + SHOTS.length;
      backBtn.disabled = idx <= 0;
      nextBtn.disabled = idx >= SHOTS.length - 1;
      big.className = "ag-score-big " + (err <= 0.08 ? "ag-pass" : err <= 0.18 ? "ag-mid" : "ag-fail");
      big.textContent = "Model says " + est.toFixed(2) + "  ·  true value " + s.truth.toFixed(2) +
        "  ·  the shot " + (s.scored ? "went in" : "did not go in");

      var lines = [];
      ORDER.forEach(function (k) {
        var lv = LEVERS.filter(function (l) { return l.key === k; })[0];
        var worth = (s.truth - LEAGUE_AVG) * s.w[k];
        lines.push((on[k] ? "  ON  " : "  off ") + lv.label.padEnd(18, " ") +
          (worth >= 0 ? "+" : "") + worth.toFixed(2) + " of this shot's value");
      });
      if (on.reputation) {
        lines.push("  ON  " + "Shooter reputation".padEnd(18, " ") +
          (s.fame ? "+0.09 because a famous player took it" : "-0.02 because nobody has heard of him"));
      }
      card.innerHTML =
        '<div class="ag-step-head"><span class="ag-icon">⚽</span><span class="ag-label">' + esc(s.d) + "</span></div>" +
        '<pre class="ag-body">' + esc(lines.join("\n")) + "</pre>";

      verdict.className = "ag-verdict " + (err <= 0.08 ? "ag-pass" : "ag-fail");
      verdict.textContent = (err <= 0.08 ? "Close enough to be useful - " : "Off by " + err.toFixed(2) + " - ") + s.note;
    }
    nextBtn.addEventListener("click", function () { if (idx < SHOTS.length - 1) { idx++; render(); } });
    backBtn.addEventListener("click", function () { if (idx > 0) { idx--; render(); } });
    render();
  }

  function boot() {
    var blocks = document.querySelectorAll(".sportsbox");
    Array.prototype.forEach.call(blocks, function (block) {
      if (block.classList.contains("agentbox-ready")) return;
      var mode = block.getAttribute("data-mode") || "score";
      if (mode === "shots") wireShots(block); else wireScore(block);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
