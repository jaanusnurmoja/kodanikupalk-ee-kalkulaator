/* ============================================================================
 * calc-mobile.js
 * Kodanikupalga kalkulaatori kitsa vaate (mobiili) abiskript.
 * Laeb mall cassiopeia_kalkulaator (index.php, registreeritud $wa->registerAndUseScript).
 *
 * Mida teeb (ainult kitsas vaates, st kui .calc-layout muutuja --calc-narrow on 1;
 * piir on kirjas css/user.css-is):
 *   1. Vahelehed: veerud .calc-pane-calc (kalkulaator) ja .calc-pane-data (lähteandmed)
 *      muutuvad vahelehtedeks. Vahelehtede nupud tegi index.php.
 *   2. Lähteandmete ja kärbete valiku peitmise/näitamise nupud (genereeritakse siin).
 *      Peidetakse klassiga "visually-hidden" (+ atribuut "inert", vt CONFIG): elemendid ja
 *      nende väärtused jäävad DOM-i alles ja kalkulaatori JS loeb neid nagu enne.
 *      Midagi ei eemaldata ega tõsteta ümber, ID-d jäävad samaks.
 *   3. Sektordiagrammid: kitsas vaates joonistatakse need ekraani laiuse järgi
 *      (kalkulaatori drawPieChart on fikseeritud 360 x 240 px, legend paremal).
 *
 * Arvutivaates (--calc-narrow = 0) ei tee skript midagi: lehe välimus ja käitumine on nagu enne.
 * Ilma JS-ita jäävad veerud kitsas vaates lihtsalt üksteise alla.
 * ========================================================================= */
(function () {
  "use strict";

  /* -------------------------------------------------------------------------
   * SEADED: muuda siin
   * ----------------------------------------------------------------------- */
  var CONFIG = {
    // Lähteandmete grupid (Fabriku fieldset'id): peidetakse nupuga "Näita alusandmeid".
    // Lisa siia id, kui lähteandmetesse tuleb uus grupp.
    baseDataSelectors: ["#group161", "#group210", "#group164", "#group205", "#group207"],

    // Kärpekohtade valik (intro, lisasumma väli ja tabel): nupp "Näita kärpevõimalusi"
    cutsSelectors: ["#group162"],

    // Kas grupp on kitsas vaates lehe avamisel peidus (true) või nähtav (false).
    // false = kasutaja saab kärpeid/sihtrühmi muuta kohe ja peidab ise.
    startCollapsed: { base: true, cuts: true },

    // Peidetud grupile lisatakse ka atribuut "inert": klaviatuur (Tab) ei sattu nähtamatutele
    // märkeruutudele. Väärtused jäävad loetavaks (.value, .checked, .innerHTML).
    // Kui tahad, et ekraanilugeja loeks peidetud grupi sisu ka kokku volditult, pane false.
    inertWhenCollapsed: true,

    labels: {
      base: { show: "Näita alusandmeid", hide: "Peida alusandmed" },
      cuts: { show: "Näita kärpevõimalusi", hide: "Peida kärpevõimalused" }
    },

    // Sektordiagrammid kitsas vaates (px)
    chart: { height: 320, minWidth: 240, fallbackWidth: 300 }
  };

  var HIDE_CLASS = "visually-hidden"; // sama klass, mida kalkulaatori päis juba kasutab (PEIDA/NÄITA)

  var layout = null;
  var tabs = [];
  var panes = {};
  var lastNarrow = null;
  var toggleBar = null;
  var collapsed = { base: CONFIG.startCollapsed.base, cuts: CONFIG.startCollapsed.cuts };
  var groups = { base: [], cuts: [] };

  /* -------------------------------------------------------------------------
   * Abifunktsioonid
   * ----------------------------------------------------------------------- */
  function isNarrow() {
    // Kitsa vaate piir on CSS-is (muutuja --calc-narrow), et see oleks ühes kohas
    return getComputedStyle(layout).getPropertyValue("--calc-narrow").trim() === "1";
  }

  function findAll(selectors) {
    var found = [];
    selectors.forEach(function (selector) {
      Array.prototype.forEach.call(layout.querySelectorAll(selector), function (el) {
        if (found.indexOf(el) === -1) found.push(el);
      });
    });
    return found;
  }

  function redrawCharts() {
    // Diagramm joonistatakse alles siis, kui kalkulaatori JS ja Google Charts on olemas
    if (typeof window.drawChart !== "function") return;
    try {
      window.drawChart();
    } catch (e) {
      /* Google Charts pole veel laaditud: see joonistab ise, kui valmis saab */
    }
  }

  /* -------------------------------------------------------------------------
   * 1. Vahelehed
   * ----------------------------------------------------------------------- */
  function setPane(name, focusTab) {
    if (!panes[name]) return;
    layout.setAttribute("data-calc-pane", name);
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-calc-tab") === name;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus();
    });
    if (name === "calc") redrawCharts(); // peidetud veerus ei saanud diagramm õiget laiust
  }

  function currentPane() {
    return layout.getAttribute("data-calc-pane") === "data" ? "data" : "calc";
  }

  function onTabKeydown(event) {
    var index = tabs.indexOf(event.currentTarget);
    var next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === -1) return;
    event.preventDefault();
    setPane(tabs[next].getAttribute("data-calc-tab"), true);
  }

  function initTabs() {
    tabs = Array.prototype.slice.call(layout.querySelectorAll("[data-calc-tab]"));
    panes.calc = layout.querySelector(".calc-pane-calc");
    panes.data = layout.querySelector(".calc-pane-data");
    if (!tabs.length || !panes.calc || !panes.data) return false; // vahelehti pole (nt puuduvad calc moodulid)

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        setPane(tab.getAttribute("data-calc-tab"), false);
        // Kui vahelehtede riba on lehe ülaosas ja kasutaja on allpool, too riba nähtavale
        var top = layout.getBoundingClientRect().top;
        if (top < 0) layout.scrollIntoView({ block: "start" });
      });
      tab.addEventListener("keydown", onTabKeydown);
    });
    return true;
  }

  // Vahelehtede ARIA-rollid on ainult kitsas vaates (arvutivaates on mõlemad veerud korraga nähtavad)
  function applyTabSemantics(on) {
    if (!tabs.length) return;
    ["calc", "data"].forEach(function (name) {
      var pane = panes[name];
      if (on) {
        pane.setAttribute("role", "tabpanel");
        pane.setAttribute("aria-labelledby", "calc-tab-" + name);
      } else {
        pane.removeAttribute("role");
        pane.removeAttribute("aria-labelledby");
      }
    });
    if (on) setPane(currentPane(), false);
  }

  /* -------------------------------------------------------------------------
   * 2. Peitmise/näitamise nupud
   * ----------------------------------------------------------------------- */
  function setCollapsed(kind, hide) {
    collapsed[kind] = hide;
    groups[kind].forEach(function (el) {
      el.classList.toggle(HIDE_CLASS, hide);
      if (CONFIG.inertWhenCollapsed) {
        if (hide) el.setAttribute("inert", "");
        else el.removeAttribute("inert");
      }
      el.setAttribute("data-calc-collapsible", "1"); // märgib, et klassi lisasime meie
    });
    var button = toggleBar && toggleBar.querySelector('[data-calc-toggle="' + kind + '"]');
    if (button) {
      button.setAttribute("aria-expanded", hide ? "false" : "true");
      button.textContent = hide ? CONFIG.labels[kind].show : CONFIG.labels[kind].hide;
    }
  }

  function makeToggleButton(kind) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-outline-dark calc-toggle";
    button.setAttribute("data-calc-toggle", kind);
    var ids = groups[kind]
      .map(function (el) { return el.id; })
      .filter(Boolean)
      .join(" ");
    if (ids) button.setAttribute("aria-controls", ids);
    button.addEventListener("click", function () {
      setCollapsed(kind, !collapsed[kind]);
    });
    return button;
  }

  function buildToggles() {
    if (toggleBar) return;
    groups.base = findAll(CONFIG.baseDataSelectors);
    groups.cuts = findAll(CONFIG.cutsSelectors);
    var all = groups.base.concat(groups.cuts);
    if (!all.length) return; // lehel pole lähteandmeid (nt aastate nimekiri)

    // Nupuriba läheb esimese peidetava grupi ette (dokumendi järjekorras)
    all.sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    toggleBar = document.createElement("div");
    toggleBar.className = "calc-toggles";
    toggleBar.setAttribute("data-calc-generated", "1");
    ["base", "cuts"].forEach(function (kind) {
      if (groups[kind].length) toggleBar.appendChild(makeToggleButton(kind));
    });
    all[0].parentNode.insertBefore(toggleBar, all[0]);

    setCollapsed("base", collapsed.base);
    setCollapsed("cuts", collapsed.cuts);
  }

  // Arvutivaatesse tagasi: nupud ära, kõik grupid nähtavaks (nagu enne)
  function removeToggles() {
    if (toggleBar && toggleBar.parentNode) toggleBar.parentNode.removeChild(toggleBar);
    toggleBar = null;
    groups.base.concat(groups.cuts).forEach(function (el) {
      if (el.getAttribute("data-calc-collapsible") !== "1") return;
      el.classList.remove(HIDE_CLASS);
      el.removeAttribute("inert");
      el.removeAttribute("data-calc-collapsible");
    });
  }

  /* -------------------------------------------------------------------------
   * 3. Sektordiagrammid kitsas vaates
   *    Kalkulaatori drawPieChart (ubiTaxCalcCompare.js) joonistab alati 360 x 240 px ja legend
   *    on paremal; telefoni laiusele see ei mahu. Siin asendame selle funktsiooni nii, et
   *    arvutivaates kutsutakse originaali (muutmata) ja kitsas vaates joonistatakse
   *    konteineri laiuse järgi, legend all. Ülejäänud valikud on samad.
   *    Kui tahad, võid kitsa vaate valikud tõsta otse ubiTaxCalcCompare.js-i drawPieChart'i.
   * ----------------------------------------------------------------------- */
  function installChartOverride() {
    var original = window.drawPieChart;
    if (typeof original !== "function" || original.calcMobilePatched) return;

    var patched = function (containerId, rows, colors) {
      if (!isNarrow() || typeof google === "undefined" || !google.visualization) {
        return original.apply(this, arguments);
      }
      var box = document.getElementById(containerId);
      var data = new google.visualization.DataTable();
      data.addColumn("string", "Topping");
      data.addColumn("number", "Slices");
      data.addRows(rows);

      var width = Math.max(CONFIG.chart.minWidth, box.clientWidth || CONFIG.chart.fallbackWidth);
      var chart = new google.visualization.PieChart(box);
      chart.draw(data, {
        width: width,
        height: CONFIG.chart.height,
        colors: colors,
        backgroundColor: "#f5f7fa",
        is3D: true,
        legend: { position: "bottom", maxLines: 6, textStyle: { color: "#555555" } }
      });
    };
    patched.calcMobilePatched = true;
    window.drawPieChart = patched;
  }

  /* -------------------------------------------------------------------------
   * Kitsa ja arvutivaate vahetus
   * ----------------------------------------------------------------------- */
  function enterNarrow() {
    installChartOverride();
    applyTabSemantics(true); // joonistab kalkulaatori vahelehe diagrammid uuesti, kui see on avatud
    buildToggles();
  }

  function leaveNarrow() {
    applyTabSemantics(false);
    removeToggles();
    redrawCharts(); // arvutivaates tagasi originaalmõõtudega diagrammid
  }

  function sync() {
    var narrow = isNarrow();
    if (narrow === lastNarrow) return;
    var first = lastNarrow === null;
    lastNarrow = narrow;
    if (first && !narrow) return; // arvutivaates lehe avamisel ei tee midagi
    if (narrow) enterNarrow();
    else leaveNarrow();
  }

  function init() {
    layout = document.querySelector(".calc-layout");
    if (!layout) return;
    initTabs();
    layout.classList.add("calc-js"); // alles nüüd peidab CSS mitteaktiivse vahelehe

    var pending = false;
    window.addEventListener("resize", function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        sync();
      });
    });
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
