/* ============================================================================
 * calc-mobile.js
 * Kodanikupalga kalkulaatori lehe abiskript: kitsa vaate (mobiili) paigutus ning lähteandmete
 * osaline peitmine.
 * Laeb mall cassiopeia_kalkulaator (index.php, registreeritud $wa->registerAndUseScript).
 *
 * Mida teeb:
 *   1. Vahelehed (ainult kitsas vaates, st kui .calc-layout muutuja --calc-narrow on 1; piir on
 *      kirjas css/user.css-is): veerud .calc-pane-calc (kalkulaator) ja .calc-pane-data (lähteandmed)
 *      muutuvad vahelehtedeks. Vahelehtede nupud tegi index.php.
 *   2. Lähteandmete peitmise/näitamise nupud (genereeritakse siin), KÕIGIL laiustel (CONFIG.baseOnWide):
 *        - "Näita kõiki alusandmeid": vaikimisi on nähtav ainult põhiosa (aasta, lapsestandardid ja suurte
 *          sihtrühmade märkeruudud, vt CONFIG.basePartial), ülejäänud lähteandmed on peidus;
 *        - "Peida kärpevõimalused": kärpekohtade tabel (#group162) on vaikimisi nähtav.
 *      Peidetakse klassiga "visually-hidden" (+ atribuut "inert", vt CONFIG): elemendid ja
 *      nende väärtused jäävad DOM-i alles ja kalkulaatori JS loeb neid nagu enne.
 *      Midagi ei eemaldata ega tõsteta ümber, ID-d jäävad samaks.
 *      Sama nupp on ka maksude arvestamise valikutel (mooduli (2) veerg #calc-deductions, "Arvesta ..."),
 *      aga ainult telefoni laiusel (--calc-phone = 1 css/user.css-is, alla 768 px).
 *   3. Sektordiagrammid (ainult kitsas vaates): joonistatakse ekraani laiuse järgi
 *      (kalkulaatori drawPieChart on fikseeritud 360 x 240 px, legend paremal).
 *
 * Ilma JS-ita jäävad veerud kitsas vaates lihtsalt üksteise alla ja kõik lähteandmed on nähtavad.
 * ========================================================================= */
(function () {
  "use strict";

  /* -------------------------------------------------------------------------
   * SEADED: muuda siin
   * ----------------------------------------------------------------------- */
  var CONFIG = {
    // Lähteandmete grupid (Fabriku fieldset'id), mis peidetakse TERVIKUNA nupuga "Näita kõiki alusandmeid":
    // sotsiaalmaks, kommentaarid, muud andmed ja toetused, mis kodanikupalga korral kaovad.
    // Lisa siia id, kui lähteandmetesse tuleb uus grupp, mille tahad vaikimisi peita.
    baseDataSelectors: ["#group210", "#group164", "#group205", "#group207"],

    // Grupid, millest peidetakse ainult OSA (sama nupp "Näita kõiki alusandmeid"). group = grupi fieldset,
    // keep = elementide valijad, mis jäävad nähtavaks: nende Fabriku elemendi konteiner (.fabrikElementContainer)
    // jääb alles, kõik grupi teised konteinerid peidetakse. Grupi pealkiri, sissejuhatus ja lõpumärkus jäävad alati nähtavaks.
    // #group161 "Peamised lähteandmed": nähtavaks jäävad aasta, ametlik lapse ülalpidamiskulu, minimaalne lapsestandard
    // ja suurte sihtrühmade (pensionisaajad, lapsed, ülejäänud) arvud märkeruutudega; rahvaarv, tulu, tulumaks ja
    // pensioni baasosa read peidetakse.
    // Kui ühtegi keep-elementi ei leita (nt Fabriku väljade nimed muutusid), ei peideta sellest grupist midagi.
    basePartial: [
      {
        group: "#group161",
        keep: [
          "#ubi_model_base_data___year_ro",
          "#ubi_model_base_data___child_per_month_ro",
          "#ubi_model_base_data___alt_child_std_ro",
          "#ubi_model_base_data___pension_receivers_ro",
          "#ubi_model_base_data___others_inc_children_ro",
          "#ubi_model_base_data___income_tax_payers_ro"
        ]
      }
    ],

    // Kärpekohtade valik (intro, lisasumma väli ja tabel): nupp "Peida kärpevõimalused" / "Näita kärpevõimalusi"
    cutsSelectors: ["#group162"],

    // Kas lähteandmete ja kärbete nupud on ka arvutivaates (true) või ainult kitsas vaates (false).
    // false = arvutivaates on kõik lähteandmed nähtavad nagu enne.
    baseOnWide: true,

    // Maksude arvestamise valikud ("Arvesta sotsiaalmaksu ...", maksuvaba tulu jt, mooduli (2) paremast
    // veerust): nupp "Näita maksude arvestamise valikuid". Ainult telefoni laiusel (alla 768 px).
    taxSelectors: ["#calc-deductions"],

    // Kas grupp on lehe avamisel peidus (true) või nähtav (false).
    // base: true = peidus on ainult lisaandmed (põhiosa jääb nähtavaks, vt basePartial);
    // cuts: false = kasutaja saab kärpeid muuta kohe ja peidab ise.
    // NB! tax: true tähendab, et vaikimisi märgitud valikud (nt maksuvaba tulu) mõjutavad tulemust ka siis,
    // kui kasutaja neid ei näe.
    startCollapsed: { base: true, cuts: false, tax: true },

    // Peidetud grupile lisatakse ka atribuut "inert": klaviatuur (Tab) ei sattu nähtamatutele
    // märkeruutudele. Väärtused jäävad loetavaks (.value, .checked, .innerHTML).
    // Kui tahad, et ekraanilugeja loeks peidetud grupi sisu ka kokku volditult, pane false.
    inertWhenCollapsed: true,

    labels: {
      base: { show: "Näita kõiki alusandmeid", hide: "Peida lisaandmed" },
      cuts: { show: "Näita kärpevõimalusi", hide: "Peida kärpevõimalused" },
      tax: { show: "Näita maksude arvestamise valikuid", hide: "Peida maksude arvestamise valikud" }
    },

    // Sektordiagrammid kitsas vaates (px)
    chart: { height: 320, minWidth: 240, fallbackWidth: 300 }
  };

  var HIDE_CLASS = "visually-hidden"; // sama klass, mida kalkulaatori päis juba kasutab (PEIDA/NÄITA)

  var layout = null;
  var tabs = [];
  var panes = {};
  var lastNarrow = null;
  var toggleBar = null; // lähteandmete ja kärbete nupuriba (kõigil laiustel, kui CONFIG.baseOnWide)
  var taxBar = null; // maksude arvestamise nupuriba (mooduli (2) reas, ainult telefoni laiusel)
  var collapsed = { base: CONFIG.startCollapsed.base, cuts: CONFIG.startCollapsed.cuts, tax: CONFIG.startCollapsed.tax };
  var groups = { base: [], cuts: [], tax: [] };

  /* -------------------------------------------------------------------------
   * Abifunktsioonid
   * ----------------------------------------------------------------------- */
  function isNarrow() {
    // Kitsa vaate piir on CSS-is (muutuja --calc-narrow), et see oleks ühes kohas
    return getComputedStyle(layout).getPropertyValue("--calc-narrow").trim() === "1";
  }

  function isPhone() {
    // Telefoni laiuse piir on samuti CSS-is (muutuja --calc-phone); telefon on alati ka kitsas vaade
    return isNarrow() && getComputedStyle(layout).getPropertyValue("--calc-phone").trim() === "1";
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
    // Nupp võib olla kummalgi ribal (lähteandmete või maksude arvestamise), seepärast otsime kogu paigutusest
    var button = layout.querySelector('[data-calc-toggle="' + kind + '"]');
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

  // Osaliselt peidetava grupi (CONFIG.basePartial) fieldset ja peidetavad elemendikonteinerid:
  // kõik grupi Fabriku elemendikonteinerid, mis ei sisalda ühtegi keep-elementi. Fabriku enda peidetud
  // konteinerid (fabrikHide) jäetakse puutumata. Kui ühtegi keep-elementi ei leita, ei peideta midagi.
  function partialParts(spec) {
    var group = layout.querySelector(spec.group);
    if (!group) return { group: null, hide: [] };
    var containers = Array.prototype.slice.call(group.querySelectorAll(".fabrikElementContainer"));
    var kept = containers.filter(function (box) {
      return spec.keep.some(function (selector) {
        return box.querySelector(selector) !== null;
      });
    });
    if (!kept.length) return { group: group, hide: [] };
    return {
      group: group,
      hide: containers.filter(function (box) {
        return kept.indexOf(box) === -1 && !box.classList.contains("fabrikHide");
      })
    };
  }

  function buildToggles() {
    if (toggleBar) return;
    var whole = findAll(CONFIG.baseDataSelectors);
    var partial = CONFIG.basePartial.map(partialParts);
    groups.base = whole.slice();
    partial.forEach(function (part) {
      groups.base = groups.base.concat(part.hide);
    });
    groups.cuts = findAll(CONFIG.cutsSelectors);
    if (!groups.base.length && !groups.cuts.length) return; // lehel pole lähteandmeid (nt aastate nimekiri)

    // Nupuriba läheb esimese tervikuna peidetava grupi või kärbete grupi ette (dokumendi järjekorras), st
    // osaliselt peidetava grupi (#group161) alla. Kui selliseid gruppe pole, siis osaliselt peidetava grupi järele.
    var anchors = whole.concat(groups.cuts);
    anchors.sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    var partialGroup = null;
    partial.forEach(function (part) {
      if (!partialGroup && part.group && part.hide.length) partialGroup = part.group;
    });
    if (!anchors.length && !partialGroup) return;

    toggleBar = document.createElement("div");
    toggleBar.className = "calc-toggles";
    toggleBar.setAttribute("data-calc-generated", "1");
    ["base", "cuts"].forEach(function (kind) {
      if (groups[kind].length) toggleBar.appendChild(makeToggleButton(kind));
    });
    if (anchors.length) anchors[0].parentNode.insertBefore(toggleBar, anchors[0]);
    else partialGroup.parentNode.insertBefore(toggleBar, partialGroup.nextSibling);

    setCollapsed("base", collapsed.base);
    setCollapsed("cuts", collapsed.cuts);
  }

  // Võtab peidetud gruppidelt meie lisatud klassi ja atribuudid ära (nagu enne)
  function restoreGroups(list) {
    list.forEach(function (el) {
      if (el.getAttribute("data-calc-collapsible") !== "1") return;
      el.classList.remove(HIDE_CLASS);
      el.removeAttribute("inert");
      el.removeAttribute("data-calc-collapsible");
    });
  }

  // Nupud ära, kõik grupid nähtavaks (nagu enne): kui nuppe ei tohi selles vaates olla (CONFIG.baseOnWide = false)
  function removeToggles() {
    if (toggleBar && toggleBar.parentNode) toggleBar.parentNode.removeChild(toggleBar);
    toggleBar = null;
    restoreGroups(groups.base.concat(groups.cuts));
  }

  // Maksude arvestamise valikud: nupp läheb veerust #calc-deductions vahetult ette. Veerg on mooduli (2)
  // reas .calc-fit-cols, seega on nupuriba selle rea lapsena veergude vahel (täislaiuses).
  // Lehel mooduli (2) pole (puudub #calc-deductions): ei tee midagi.
  function buildTaxToggle() {
    if (taxBar) return;
    groups.tax = findAll(CONFIG.taxSelectors);
    if (!groups.tax.length) return;
    taxBar = document.createElement("div");
    taxBar.className = "calc-toggles calc-toggles-tax";
    taxBar.setAttribute("data-calc-generated", "1");
    taxBar.appendChild(makeToggleButton("tax"));
    groups.tax[0].parentNode.insertBefore(taxBar, groups.tax[0]);
    setCollapsed("tax", collapsed.tax); // kasutaja varasem valik säilib ka pärast ekraani pööramist
  }

  function removeTaxToggle() {
    if (!taxBar) return;
    if (taxBar.parentNode) taxBar.parentNode.removeChild(taxBar);
    taxBar = null;
    restoreGroups(groups.tax);
  }

  // Telefoni laiusel nupp olemas, muidu (tahvel, arvutivaade) ploki sisu nähtav nagu enne
  function syncTaxToggle() {
    if (isPhone()) buildTaxToggle();
    else removeTaxToggle();
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
  }

  function leaveNarrow() {
    applyTabSemantics(false);
    redrawCharts(); // arvutivaates tagasi originaalmõõtudega diagrammid
  }

  // Lähteandmete ja kärbete nupud: kõigil laiustel (CONFIG.baseOnWide) või ainult kitsas vaates.
  // Kasutaja viimane valik (nähtav / peidus) säilib ekraani pööramisel.
  function syncToggles() {
    if (isNarrow() || CONFIG.baseOnWide) buildToggles();
    else removeToggles();
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
        syncToggles();
        syncTaxToggle();
      });
    });
    sync();
    syncToggles();
    syncTaxToggle();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
