/* ============================================================================
 * ubiTaxCalcCompare.js
 * Kodanikupalga (UBI) kalkulaatori arvutus- ja kasutajaliidese loogika.
 *
 * Sisu:
 *   1. Jagatud olek
 *   2. Üldised abifunktsioonid (round, getFieldFloatValue, writeValues, ...)
 *   3. Aasta ja aastapõhised parameetrid
 *   4. Lehe käitumine (varem HTML-i inline-skriptides)
 *   5. Inimeste ja kulukärbete arvutus (calcPeople, calcReduction, ...) ning
 *      lapse eraldi kodanikupalk (märkeruut "Lastele teises suuruses")
 *   6. revenueCalc  - brutotulu (annual_revenue) ja maksuvaba tulu (taxfree_sum)
 *   7. wageCalc     - palgakalkulatsioon (tavaline ja UBI-variant) ja protsendid;
 *                     leibkonna vaade (2 täiskasvanut, lapsed) tulemustabelis
 *   8. displayAlert, outputCalc
 *   9. Diagrammid ja "sama suured kulud" lause
 *  10. Leibkonna kuise sissetuleku diagramm (moodul "KalkulaatorV3M (4)"; kutsutakse wageCalc()-ist)
 *  11. Tulemuse lause ("see leibkond saab kodanikupalgaga X € võrra rohkem"; element #result-sentence
 *      diagrammimoodulis; kutsutakse wageCalc()-ist)
 *  12. Maksumudeli valik diagrammi juures (variant 1 / 2; nupud name="taxscenario_chart" diagrammimoodulis,
 *      tegelik valik on mooduli (3) nuppudel name="taxscenario"; kutsutakse wageCalc()-ist)
 *  13. Täiendavate kärbete kerimisväli diagrammi all (nooled muudavad Fabriku välja #all_value_eur_custom
 *      100 mln € sammuga; näit loetakse väljalt; kutsutakse wageCalc()-ist)
 *
 * HTML-i käsitlejad (onclick="outputCalc();..." jms) kutsuvad neid funktsioone
 * nimepidi, seega kõik avalikud nimed on säilitatud.
 *
 * NB! Kood loeb ja kirjutab arvutuse vahetulemusi DOM-i väljadest (.value /
 * .innerHTML, ehk sõnedena). See on tahtlikult säilitatud: ümberstruktureerimine
 * ei tohi muuta ümardamist ega arvutusjärjekorda.
 * ========================================================================= */


/* ---------------------------------------------------------------------------
 * 1. JAGATUD OLEK
 *    Varem deklareeriti osa neist HTML-i inline-skriptides; väärtused omistavad
 *    init*-funktsioonid (vt 4. osa), mida HTML kutsub samas kohas kui varem.
 * ------------------------------------------------------------------------- */
var i3 = false;        // true = "netotulu" (input_3) režiim; seab netWageFirst(), loeb writeValues()
var year;              // lehe aasta (initUbiModel); loeb ka taxfree_sum käsitleja (minmax(value, year))
var eur;               // brutopalga sisend (setEurGross)
var ubiAmount;         // kodanikupalga summa kuus (setUbiAmount)
var people = [];       // sihtrühmade (täiskasvanu / pensionär / laps) elemendid, vt checkPeople()
var peopleTotal;       // valitud sihtrühmade inimeste arv
var grossNeed;         // aastane brutovajadus
var reductionTotal;    // kärbete summa
var realNeed;          // tegelik rahavajadus = grossNeed - reductionTotal
var incomeTaxTotal;    // tulumaksu kogulaekumine
var declaredIncome;    // deklareeritud tulu (ilma toetusteta)
var newFlatTax;        // uus ühtne tulumaksumäär, %
var addedTax;          // lisanduv maksumäär, %
var reducer = [];      // kärpekohtade nimed ja väärtused (ubiCostReducers)
var ubiChildCustom = false; // true = kasutaja muutis lapse summat ise; siis see ei järgi enam põhisummat
var personValues = null;    // tulemustabeli ühe täiskasvanu väärtused, kui leibkonna vaade on neid üle kirjutanud

// Eesti sotsiaalmaksu määr (33%)
var SOCIALTAX_RATE = 0.33;


/* ---------------------------------------------------------------------------
 * 2. ÜLDISED ABIFUNKTSIOONID
 * ------------------------------------------------------------------------- */
function byId(id) {
  return document.getElementById(id);
}

function round(n, dec) {
  var x = Math.round(n * Math.pow(10, dec));
  return (x / Math.pow(10, dec)).toFixed(dec);
}

function resetValues(form) {
  for (var i = 0; i < form.elements.length; i++) {
    if (form.elements[i].type == "text") {
      form.elements[i].value = "";
    }
  }
}

function netWageFirst(i3checked = false) {
  i3 = i3checked;
}

function getFieldFloatValue(fieldId) {
  var element = document.getElementById(fieldId);
  var valattr = element.value ? element.value : element.innerHTML;
  return parseFloat(valattr.replace(",", ".").replace(/\s/g, ""));
}

function writeValues(fieldId, value) {
  // NB: includes() teine argument on siin negatiivne, mis käitub nagu 0 ehk
  // otsitakse sõne kogu ID-st (mitte lõpust). Säilitatud täpselt sellisena.
  if (!fieldId.includes("_ubi_ubi", -8)) {
    if (i3 === true && (fieldId.includes("_ubi", -4) || fieldId.includes("_std", -4))) {
      document.getElementById(fieldId).innerHTML = value;
    }
    if (document.getElementById(fieldId + "_ubi") && i3 === false) {
      document.getElementById(fieldId + "_ubi").innerHTML = value;
    }
    if (document.getElementById(fieldId + "_std")) {
      document.getElementById(fieldId + "_std").innerHTML = value;
    }
  }
  var i = 2;
  var extraField;
  while ((extraField = document.getElementById(fieldId + "_std_" + i))) {
    extraField.innerHTML = value;
    i++;
  }
}

// Lisab/eemaldab elemendilt "tuhmi" stiili (kasutusel variandi 1/2 tabeliridadel)
function setMuted(el, muted) {
  ["text-muted", "font-weight-light"].forEach(function (cls) {
    if (muted) el.classList.add(cls);
    else el.classList.remove(cls);
  });
}

// Näitab/peidab elemendi Bootstrapi klassiga d-none
function setHidden(el, hidden) {
  if (hidden) el.classList.add("d-none");
  else el.classList.remove("d-none");
}

// Sisse lülitatud sihtrühmade inimeste arv
function calcPeopleFull() {
  var peopleTotal = 0;
  var peopleOpt = document.getElementsByName("peopleOpt");
  for (var opt of peopleOpt) {
    if (opt.checked) {
      peopleTotal += parseInt(opt.value);
    }
  }
  return peopleTotal;
}


/* ---------------------------------------------------------------------------
 * 3. AASTA JA AASTAPÕHISED PARAMEETRID
 *    Varem oli sama if/else-ahel kopeeritud viide funktsiooni.
 *    Uue aasta lisamiseks: SUPPORTED_YEARS + SOCIALTAX_MIN (+ vajadusel
 *    getIncomeTaxRate / getTaxFreeYearDefault).
 * ------------------------------------------------------------------------- */

// Aastad, mille raadionupud (year2026 jne) lehel on; kontrollitakse selles järjekorras
var SUPPORTED_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

// Sotsiaalmaksu kuumäär (riigieelarve seadus, sotsiaalmaksuseaduse § 2.1 alusel)
var SOCIALTAX_MIN = {
  2020: 178.2,
  2021: 192.72,
  2022: 192.72,
  2023: 215.82,
  2024: 239.25,
  2025: 270.6,
  2026: 292.38,
};

// Lehelt valitud aasta (raadionupp) või undefined, kui ükski pole valitud
function getCheckedYear() {
  for (var k = 0; k < SUPPORTED_YEARS.length; k++) {
    if (document.getElementById("year" + SUPPORTED_YEARS[k]).checked === true) {
      return SUPPORTED_YEARS[k];
    }
  }
  return undefined;
}

/*
  Aasta, mille kohta kalkulatsioon käib. Sõltub sellest, millised lähteandmed me avame..
*/
function getYear() {
  if (document.getElementById("ubi_model_base_data___year_ro")) {
    return document.getElementById("ubi_model_base_data___year_ro").innerHTML;
  } else {
    return document.getElementById("ubi_model_calculated___year_ro").innerHTML;
  }
}

// undefined, kui aastat tabelis pole (nagu varem: muutuja jäi määramata)
function getSocialTaxMin(y) {
  return SOCIALTAX_MIN[Number(y)];
}

function getIncomeTaxRate(y) {
  return y >= 2025 ? 0.22 : 0.2;
}

// Maksuvaba tulu aastas
function getTaxFreeYearDefault(y) {
  if (y >= 2026) return 8400;
  if (y >= 2023) return 7848;
  return 6000;
}

// Kogumispensioni II samba kinnipeetav osa sotsiaalmaksust (2021. aastal 0)
function getFundedPensionFromSocialTax(y) {
  return y == 2021 ? 0 : 0.04;
}

/*
  Senise korra järgi lastele makstavad toetused (perehüvitiste seadus), eurot kuus.
    child12    - lapsetoetus 1. ja 2. lapsele (lapse kohta)
    child3plus - lapsetoetus 3. ja iga järgmisele lapsele (lapse kohta)
    large3to6  - suurpere toetus (lasterikka pere toetus), 3-6 lapsega perele (pere kohta)
    large7plus - suurpere toetus, 7 ja enama lapsega perele (pere kohta)
  Allikad: Sotsiaalministeerium (perehüvitiste seaduse muudatused 2023; laste ja perede toetamise KKK;
  perepoliitiliste meetmete ülevaade 2025) ja riigikogu eelnõu seletuskiri. 2023. aastal oli suurpere
  toetus ajutiselt 650/850 (alates 2024 450/650). 2025. ja 2026. aastal muudatusi ei ole,
  summasid ei indekseerita.
  Uue aasta lisamiseks: lisa siia rida (ja SUPPORTED_YEARS + SOCIALTAX_MIN).
*/
var CHILD_BENEFITS = {
  2020: { child12: 60, child3plus: 100, large3to6: 300, large7plus: 400 },
  2021: { child12: 60, child3plus: 100, large3to6: 300, large7plus: 400 },
  2022: { child12: 60, child3plus: 100, large3to6: 300, large7plus: 400 },
  2023: { child12: 80, child3plus: 100, large3to6: 650, large7plus: 850 },
  2024: { child12: 80, child3plus: 100, large3to6: 450, large7plus: 650 },
  2025: { child12: 80, child3plus: 100, large3to6: 450, large7plus: 650 },
  2026: { child12: 80, child3plus: 100, large3to6: 450, large7plus: 650 },
};

// Laste raha senise korra järgi kuus: lapsetoetus + suurpere toetus (nullid, kui aastat tabelis pole)
function getChildBenefits(y, children) {
  var b = CHILD_BENEFITS[Number(y)];
  if (!b || !(children > 0)) return { allowance: 0, largeFamily: 0, total: 0 };
  var allowance = Math.min(children, 2) * b.child12 + Math.max(children - 2, 0) * b.child3plus;
  var largeFamily = children >= 7 ? b.large7plus : children >= 3 ? b.large3to6 : 0;
  return { allowance: allowance, largeFamily: largeFamily, total: allowance + largeFamily };
}

// Maksuvaba tulu ülempiir kuus sisestusvälja jaoks
function minmax(n, y) {
  var tfp = document.getElementById("taxfree_period");
  var i = tfp.options[tfp.selectedIndex].value;
  var min = 0;
  var max = (getTaxFreeYearDefault(y) / 12) * i;

  if (n < min) n = round(min, 2);
  if (n > max) n = max;
  return n || "";
}

// Tööaeg ja perioodi kordaja: tunnipalga (period == 1) korral korrutatakse tundidega,
// aastapalga (period == 3) korral jagatakse 12 kuuks
function getPeriodInfo() {
  var workhours = getFieldFloatValue("workhours");
  var period = getFieldFloatValue("period");
  return {
    period: period,
    workhours: period == 1 ? workhours : 1,
    nper: period == 3 ? 12 : 1,
  };
}


/* ---------------------------------------------------------------------------
 * 4. LEHE KÄITUMINE (varem HTML-i inline-skriptides)
 * ------------------------------------------------------------------------- */

// Kärbete välja "100M" lülitus topeltklõpsul
function toggleVals() {
  let numField = document.getElementById("all_value_eur_custom");
  numField.classList.toggle("100M");
  numField.value = numField.classList.contains("100M") ? numField.step : numField.min;
}

/* tagamaks seda, et checked kaoks ja ilmuks html'i */
function toggleChecked(element) {
  if (!element.checked) {
    element.removeAttribute("checked");
  } else {
    element.setAttribute("checked", "checked");
  }
}

/*
  Kodanikupalga kalkulaator - moodustame märkeruudud, et valida kodanikupalga sihtrühmad.
  Vaikimisi on märgitud kõik, st eeldatakse, et makstakse kõigile.
*/
function checkPeople() {
  people["adult"] = document.getElementById("ubi_model_base_data___income_tax_payers_ro");
  people["old"] = document.getElementById("ubi_model_base_data___pension_receivers_ro");
  people["child"] = document.getElementById("ubi_model_base_data___others_inc_children_ro");
  for (var category in people) {
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = category;
    cb.name = "peopleOpt";
    cb.value = parseInt(people[category].innerHTML);
    cb.style = "display:inline;margin-left:5px;";
    cb.setAttribute("checked", "checked");
    cb.setAttribute("onclick", "toggleChecked(this);calcPeople(this);outputCalc();");
    people[category].setAttribute("style", "display:inline-block;margin-right:5px");
    people[category].parentElement.appendChild(cb);
  }
}

function GetSelectValue() {
  var period = document.getElementById("period");
  return period.options[period.selectedIndex].value;
}

function ChangeTFMLabel(period) {
  var unitLabel = Number(period) == 3 ? "aastas" : "kuus";
  document.getElementById("period_unit").innerHTML = unitLabel;
}

function ChangeFundedPensionLabel(year) {
  // (kunagi sõltus tekst aastast; praegu on alati sama)
  document.getElementById("fundedPensionLabel").innerHTML = "Kogumispension (II sammas)";
}

function GetRadiobuttonValue(fieldName) {
  var field = document.forms["wage"].elements[fieldName];
  for (var i = 0; i < field.length; i++) {
    if (field[i].checked) {
      return field[i].value;
    }
  }
}

// NB: parameeter `year` on tahtlikult sama nimega kui globaalne muutuja: siin
// muudetakse ainult kohalikku koopiat (nagu varemgi), globaalset aastat mitte.
function toggleAnnualRevenueVisibility(year, show) {
  var revenue_row = document.getElementById("revenue_row");
  var taxfree_x = document.getElementById("taxfree_x");

  var checkedYear = getCheckedYear();
  if (checkedYear !== undefined) year = checkedYear;

  if (year >= 2018 && taxfree_x.checked) {
    revenue_row.style.display = "table-row";
    taxfree_heading.style.display = "table-row";
    taxfree_row.style.display = "table-row";
    taxfree_period_row.style.display = "table-row";
  } else {
    revenue_row.style.display = "none";
    taxfree_heading.style.display = "none";
    taxfree_row.style.display = "none";
    taxfree_period_row.style.display = "none";
  }
}

function toggleRowVisibility(show) {
  document.getElementById("hours_row").style.display = show ? "table-row" : "none";
}

function toggleRadioVisibility(year, show) {
  var fp2014 = document.getElementById("fp2014");
  var pension_x = document.getElementById("pension_x");

  var checkedYear = getCheckedYear();
  if (checkedYear !== undefined) year = checkedYear;

  if (year == 2017 && pension_x.checked) {
    fp2014.style.display = "table-row";
  } else {
    fp2014.style.display = "none";
  }
}

function setUbiAmount(value) {
  ubiAmount = value;
}

function setEurGross(v) {
  eur = v;
}

function userLanguage(objSelect) {
  var lingua = objSelect.options[objSelect.selectedIndex];
  window.location.href = lingua.value;
}

/* --- Lehe algväärtustamine: HTML kutsub neid samas kohas, kus varem oli vastav inline-kood --- */

// Vaikimisi kodanikupalk = lapse miinimum (algandmed)
function initUbiAmountFromBaseData() {
  ubiAmount = parseFloat(
    document.getElementById("ubi_model_base_data___alt_child_std_ro").innerHTML
  ).toFixed(2);
  setUbiAmount(ubiAmount);
}

// Vaikimisi brutopalk = keskmine brutopalk
function initEurFromBaseData() {
  eur = parseFloat(
    document.getElementById("ubi_model_base_data___avg_gross_wage_ro").innerHTML
  ).toFixed(2);
  setEurGross(eur);
}

function initMedianAndMinWageHint() {
  var median = document.getElementById("ubi_model_base_data___median_gross_wage_ro").innerHTML;
  document.getElementById("medianhint").innerHTML = median;
  var minWage = document.getElementById("ubi_model_base_data___min_wage_ro").innerHTML;
  document.getElementById("minwagehint").innerHTML = minWage;
}

// Brutopalga väljade algseis (varem <script onpageshow=...> lehe lõpus)
function initGrossWageFields() {
  document.getElementById("eur").value = eur;
  document.getElementById("grosswage").value = eur;
  document.getElementById("grosswage_std").value = eur;
  document.getElementById("grosswage_ubi").value = eur;
  eur = document.getElementById("eur").value;
}

// Kodanikupalga mudeli algseis: summa, inimeste arv, kärped, maksumäärad, aasta
function initUbiModel() {
  document.getElementById("ubi-amount").value = ubiAmount;
  document.getElementById("ubiPerYear").value = 12 * ubiAmount;
  ubiAmount = document.getElementById("ubi-amount").value;
  initUbiChildFields();

  peopleTotal = calcPeopleFull();
  grossNeed = calcGrossNeed();
  document.getElementById("targetPpl").innerHTML = peopleTotal;
  document.getElementById("grossNeed").innerHTML = round(grossNeed, 2);

  ubiCostReducers();

  reductionTotal = calcReductionFull();
  document.getElementById("reduceBy").innerHTML = reductionTotal.toFixed(2);

  incomeTaxTotal = parseFloat(document.getElementById("ubi_model_base_data___income_tax_total_ro").innerHTML);
  // enne oli ubi_model_base_data___decl_income_total_ro
  declaredIncome = parseFloat(document.getElementById("ubi_model_base_data___decl_income_no_benefits_ro").innerHTML);

  realNeed = grossNeed - reductionTotal;
  document.getElementById("realNeed").innerHTML = round(realNeed, 2);

  newFlatTax = (100 * (incomeTaxTotal + realNeed)) / declaredIncome;
  addedTax = (100 * realNeed) / declaredIncome;
  console.log(
    "newFlatTax (" + newFlatTax + ")= (100 * (" + incomeTaxTotal + "+" + realNeed + ")) / " + declaredIncome +
      " ehk " + (100 * (incomeTaxTotal + realNeed)) / declaredIncome
  );

  document.getElementById("newFlatTax").innerHTML = newFlatTax.toFixed(2);
  document.getElementById("addedTax").innerHTML = addedTax.toFixed(2);

  year = getYear();
  document.getElementById("year" + year).setAttribute("checked", "checked");
  document.getElementById("yearToObserve").innerHTML = year;
}

// Lehe laadimisel: lükka vaikimisi valitud sisendirežiimi raadionuppu, et käivituksid olemasolevad kuulajad
function clickDefaultInputMode() {
  const defaultRadio = document.querySelector('input[name="input"]:checked');
  if (defaultRadio) {
    defaultRadio.dispatchEvent(new Event("click"));
  }
}

/* ---------------------------------------------------------------------------
 * 5. INIMESED JA KULUKÄRPED
 * ------------------------------------------------------------------------- */

// Sihtrühma märkeruut muutus: uuenda inimeste arvu ja sellest sõltuvaid kärbeid
function calcPeople(ch) {
  syncChildUbiAvailability();
  if (ch.type == "checkbox") {
    if (ch.checked === true) {
      peopleTotal += parseInt(ch.value);
    } else {
      peopleTotal -= parseInt(ch.value);
    }
  }
  toggleCostReducers(ch, peopleTotal);
}

// Loob iga kärpekoha juurde märkeruudu (id = sihtrühm + "_value_eur_" + järjekorranumber)
function ubiCostReducers(element = null, ind = null) {
  var i = ind === null ? 0 : ind;
  var nameField;
  var valueField;
  var optional;
  var r;
  while (document.getElementById("ubi_cost_cut_opt_values___ubi_cost_cutting_opts_id_ro_" + i)) {
    nameField = document.getElementById("ubi_cost_cut_opt_values___ubi_cost_cutting_opts_id_ro_" + i);
    valueField = document.getElementById("ubi_cost_cut_opt_values___value_eur_ro_" + i);
    optional = document
      .getElementById("ubi_cost_cut_opt_values___optional_ro_" + i)
      .children[0].classList.contains("icon-checkmark");
    console.log("Check optional: " + optional);
    r = {
      name: nameField.innerHTML.replace(/\n/g, "").replace("<br>", ""),
      value: Number(valueField.innerHTML),
    };
    reducer[i] = r;
    var target = r.name.includes("Pere")
      ? "child"
      : r.name.includes("Pension")
      ? "old"
      : r.name.includes("määramata")
      ? "all"
      : "adult";
    if (element !== null) {
      target = element.id;
    }

    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = target + "_value_eur_" + i;
    cb.name = "reductionValue";
    cb.value = r.value;
    cb.style = "display:inline;float:right";
    cb.setAttribute("onclick", "toggleChecked(this);calcReduction(this,true);outputCalc();");
    if (optional === false) cb.setAttribute("checked", "checked");
    valueField.setAttribute("style", "display:inline;margin-right:5px;");
    valueField.parentElement.appendChild(cb);
    i++;
  }
}

// Kärbete lisaväli (Fabrik, id="all_value_eur_custom", name="reductionValueCustom"): kasutaja oma summa või
// kerimisvälja (13. osa) 100 mln € sammud. Tühi, vigane või puuduv väli = 0.
function customReductionValue() {
  var field = document.getElementById("all_value_eur_custom");
  return field === null ? 0 : parseFloat(field.value) || 0;
}

function calcReductionFull() {
  var total = 0;
  var reductionValue = document.getElementsByName("reductionValue");
  for (var row of reductionValue) {
    if ((row.checked === true || (row.type == "text" && row.value > 0)) && row.disabled === false) {
      total += parseFloat(row.value);
    }
  }
  // Lisaväli on name="reductionValueCustom", seega ülaltoodud tsükkel seda ei näe. Ilma siinse liitmiseta
  // kustutas näiteks kodanikupalga summa muutus (calcReduction(ubi-amount)) lisakärbe arvutusest, kuigi väli näitas seda edasi.
  return total + customReductionValue();
}

function calcReduction(element = null, click = false, gross = null) {
  console.log("Esialgne kärbe = " + reductionTotal);
  if (element.type == "checkbox") {
    if (element.checked === true && element.disabled === false) {
      console.log(reductionTotal + "+" + element.value);
      reductionTotal += parseFloat(element.value);
      console.log("=" + reductionTotal);
    } else if (
      (element.checked === true && element.disabled === true) ||
      (element.checked === false && click === true)
    ) {
      console.log(reductionTotal + "-" + element.value);
      reductionTotal -= parseFloat(element.value);
      console.log("=" + reductionTotal);
    }
  } else if (element.id === "ubi-amount") {
    // Kodanikupalga summa muutus kärbete summat ei muuda (varem liideti siin kärbetele ka kuusumma)
    reductionTotal = calcReductionFull();
    console.log("=" + reductionTotal);
  } else {
    // Lisaväli (#all_value_eur_custom): calcReductionFull() sisaldab selle väärtust juba
    reductionTotal = calcReductionFull();
    console.log("=" + reductionTotal);
  }
  if (gross === null) gross = grossNeed;
  document.getElementById("grossNeed").innerHTML = gross.toFixed(2);
  document.getElementById("reduceBy").innerHTML = reductionTotal.toFixed(2);
  realNeed = gross - reductionTotal;
  document.getElementById("realNeed").innerHTML =
    realNeed.toFixed(2) + " (" + gross.toFixed(2) + " - " + reductionTotal.toFixed(2) + ")";
  // NB: fpp_1 oli varem implitsiitne globaalne element (window.fpp_1); nüüd selgesõnaline
  var fppValue = document.getElementById("fpp_1").value;
  newFlatTax = (100 * (incomeTaxTotal + realNeed)) / (declaredIncome - fppValue);
  addedTax = (100 * realNeed) / (declaredIncome - fppValue);
  document.getElementById("newFlatTax").innerHTML = newFlatTax.toFixed(2);
  document.getElementById("addedTax").innerHTML = addedTax.toFixed(2);
}

function toggleCostReducers(element, peopleTotal) {
  if (element.id == "ubi-amount") {
    ubiAmount = element.value;
    grossNeed = calcGrossNeed();
    calcReduction(element, false, grossNeed);
  } else {
    var reducerCbList = document.getElementsByName("reductionValue");
    var reducersFound = false;
    for (var i = 0; i < reducerCbList.length; i++) {
      if (document.getElementById(element.id + "_value_eur_" + i)) {
        reducersFound = true;
        if (element.checked === false) {
          reducerCbList[i].setAttribute("disabled", "disabled");
        } else {
          reducerCbList[i].removeAttribute("disabled");
        }
        grossNeed = calcGrossNeed();
        calcReduction(reducerCbList[i], false, grossNeed);
        document.getElementById("targetPpl").innerHTML = peopleTotal;
      }
    }
    // Sihtrühmal, kellel pole oma kärpekohta (nt "Ülejäänud"), ei jõua tsükkel ühegi reani: uuenda vajalik kate,
    // maksumäärad ja sihtrühma inimeste arv ikkagi (varem jäid need eelmise klõpsu väärtustele)
    if (!reducersFound) {
      grossNeed = calcGrossNeed();
      calcReduction(document.getElementById("ubi-amount"), false, grossNeed);
      document.getElementById("targetPpl").innerHTML = peopleTotal;
    }
  }
}

/* --- Lapse eraldi kodanikupalk (märkeruut "Lastele teises suuruses") ---
   Väljad: ubi-amount-child (kuusumma) ja ubiChildPerYear (readonly, aastasumma), peidetud kuni
   märkeruut ubi_child_x on valitud. Väljad on pakis #ubi-child-box.
   Kõik allolevad funktsioonid taluvad, et neid elemente lehel pole (vana HTML + uus JS). */

// Märgitud sihtrühmade inimesed eraldi: täiskasvanud (täiskasvanud + pensionärid) ja lapsed
function countTargetGroups() {
  var counts = { adults: 0, children: 0 };
  var peopleOpt = document.getElementsByName("peopleOpt");
  for (var opt of peopleOpt) {
    if (!opt.checked) continue;
    if (opt.id === "child") counts.children += parseInt(opt.value);
    else counts.adults += parseInt(opt.value);
  }
  return counts;
}

// Kas lastele on määratud eraldi kodanikupalga summa (märkeruut sees ja väli nähtav)
function isChildUbiSeparate() {
  var cb = byId("ubi_child_x");
  return cb !== null && cb.checked === true && isChildGroupTargeted();
}

/*
  Kui lapsed pole kodanikupalga sihtrühmas, jätkub laste osas senine perehüvitiste süsteem ja lapse eraldi summal
  pole mõtet: märkeruut "Lastele teises suuruses" ja lapse summa väli lülitatakse välja. Märkeruudu seis ja
  sisestatud summa jäävad alles ning kehtivad uuesti, kui lapsed on taas sihtrühmas.
*/
function syncChildUbiAvailability() {
  var off = !isChildGroupTargeted();
  var hint = "Lapsed pole kodanikupalga sihtrühmas, neile jätkub senine perehüvitiste süsteem";
  var cb = byId("ubi_child_x");
  var field = byId("ubi-amount-child");
  var label = document.querySelector('label[for="ubi_child_x"]');
  if (cb !== null) {
    cb.disabled = off;
    cb.title = off ? hint : "";
  }
  if (field !== null) field.disabled = off;
  if (label !== null) {
    label.title = off ? hint : "";
    label.style.opacity = off ? "0.5" : "";
  }
  updateAltSentenceVisibility();
}

// Kas lapsed kuuluvad kodanikupalga sihtrühma (sihtrühma märkeruut "child"; ilma märkeruuduta loetakse: jah)
function isChildGroupTargeted() {
  var childGroup = byId("child");
  return childGroup === null || childGroup.checked === true;
}

// Kas mõni täiskasvanute sihtrühm (pensionisaajad, ülejäänud) on märgitud; ilma sihtrühma märkeruutudeta loetakse: jah
function isAdultGroupTargeted() {
  if (document.getElementsByName("peopleOpt").length === 0) return true;
  return countTargetGroups().adults > 0;
}

/*
  Täiskasvanu kodanikupalk kuus: väli "ubi-amount" (nimisumma), kui täiskasvanute sihtrühm on märgitud,
  muidu 0 (nt kui sihtrühmaks on märgitud ainult lapsed). Lapse summat see ei puuduta: see jääb nimisummaks
  või lapse eraldi väljaks (getChildUbiMonthly).
*/
function getAdultUbiMonthly(ubiPerMonth) {
  return isAdultGroupTargeted() ? ubiPerMonth : 0;
}

/*
  Suurperetoetuse säilimine kodanikupalga korra korral.
  Fabriku kärpekohtade loetelus on lapsetoetused ja suurperetoetused koos ühes reas ("Peretoetused: kõik
  asendatavad, v.a. van. hüv."). ubiCostReducers annab selle rea märkeruudule id "child_value_eur_<nr>"; sama
  prefiksi saavad aga ka teised "Pere"-nimelised read (nt vanemahüvitis), seega ainult prefiksi järgi ei piisa.
  Õige rea tunneb ära samas tr-is oleva välja ubi_cost_cut_opt_values___opt_name_ro_<nr> järgi: selle
  sisu peab olema FAMILY_BENEFIT_CUT_OPT_NAME (1).
  Kui see kärbe pole märgitud, siis lapsetoetusi ja suurperetoetusi ei kärbita ja suurperetoetus säilib: see
  lisatakse kodanikupalga variandi netotulule ja riigilt laekuva raha hulka (readHousehold: hh.largeKept).
  Märkeruudu seis loetakse `checked` järgi. Kui sihtrühm "lapsed" on maha võetud, on kärpekohad välja lülitatud
  ja senised perehüvitised säilivad täies mahus (readHousehold: hh.keepsOldBenefits); seda funktsiooni siis ei vaadata.
  Kui sellist märkeruutu lehel pole (nt aasta lähteandmetes pole kärpekohta), käitutakse nagu varem: ei säili.
*/
var FAMILY_BENEFIT_CUT_OPT_NAME = 1;

function getFamilyBenefitCutBoxes() {
  var boxes = [];
  var prefix = "child_value_eur_";
  var all = document.getElementsByName("reductionValue");
  for (var i = 0; i < all.length; i++) {
    var id = all[i].id;
    if (id.indexOf(prefix) !== 0) continue;
    var optName = byId("ubi_cost_cut_opt_values___opt_name_ro_" + id.slice(prefix.length));
    if (optName !== null && Number(optName.innerHTML.replace(/<[^>]*>/g, "").trim()) === FAMILY_BENEFIT_CUT_OPT_NAME) {
      boxes.push(all[i]);
    }
  }
  return boxes;
}

function isLargeFamilyBenefitKept() {
  var boxes = getFamilyBenefitCutBoxes();
  if (boxes.length === 0) return false;
  return boxes.every(function (box) {
    return box.checked !== true;
  });
}

/*
  Aastane brutovajadus (grossNeed).
  Eraldi lapse summa korral: (täiskasvanud + pensionärid) * põhisumma + lapsed * lapse summa.
  Muidu kõik märgitud sihtrühmad * põhisumma (nagu varem).
*/
function calcGrossNeed() {
  var ppl = countTargetGroups();
  if (isChildUbiSeparate()) {
    return 12 * (ppl.adults * ubiAmount + ppl.children * byId("ubi-amount-child").value);
  }
  return 12 * (ppl.adults + ppl.children) * ubiAmount;
}

// Lapse väli saab algväärtuseks põhisumma (vaikimisi on need samad)
function initUbiChildFields() {
  var childField = byId("ubi-amount-child");
  if (childField === null) return;
  childField.value = ubiAmount;
  updateUbiChildPerYear();
}

// Lapse aastasumma (readonly väli) = 12 * lapse kuusumma
function updateUbiChildPerYear() {
  var yearField = byId("ubiChildPerYear");
  if (yearField !== null) yearField.value = 12 * getFieldFloatValue("ubi-amount-child");
}

// Kuni kasutaja pole lapse summat ise muutnud, järgib see põhisummat
function syncChildUbiWithMain() {
  var childField = byId("ubi-amount-child");
  if (childField !== null && !ubiChildCustom) childField.value = byId("ubi-amount").value;
}

// Lapse kodanikupalk kuus leibkonna arvutuse jaoks: eraldi väli, kui see on sees, muidu põhisumma
function getChildUbiMonthly(ubiPerMonth) {
  return isChildUbiSeparate() ? getFieldFloatValue("ubi-amount-child") : ubiPerMonth;
}

/*
  Põhisumma (ubi-amount) või lapse summa (ubi-amount-child) muutus: uuenda aastasummad, päise arvud
  (vajalik kate, maksumäärad) ja alles seejärel tulemustabel.
  NB: varem kutsus ubi-amount käsitleja outputCalc() enne calcPeople()-t, mistõttu tabel kasutas viimast
  klahvivajutust eelmise maksumääraga; nüüd on järjekord päis -> tabel.
*/
function onUbiAmountChange(el) {
  if (el.id === "ubi-amount-child") ubiChildCustom = true;
  else setUbiAmount(el.value);
  syncChildUbiWithMain();
  calcPeople(byId("ubi-amount"));
  outputCalc(); // uuendab ka aastasummade väljad (ubiPerYear, ubiChildPerYear)
}

// Märkeruut "Lastele teises suuruses": näita/peida lapse väljad ja arvuta uuesti
function toggleChildUbi(cb) {
  setHidden(byId("ubi-child-box"), !cb.checked);
  if (cb.checked) syncChildUbiWithMain();
  updateUbiChildPerYear();
  updateAltSentenceVisibility();
  calcPeople(byId("ubi-amount"));
  outputCalc();
}

// Lause "sama suured kulud nagu kõigile võrdse ... korral" kehtib ainult siis, kui kõik saavad sama summa
function updateAltSentenceVisibility() {
  var box = byId("altSentence");
  if (box !== null) setHidden(box, isChildUbiSeparate());
}


/* ---------------------------------------------------------------------------
 * 6. revenueCalc: brutotulu (annual_revenue) ja maksuvaba tulu summa (taxfree_sum)
 *    Sisendirežiimid: input_1 = tööandja kulu, input_2 = brutopalk, input_3 = netotulu
 * ------------------------------------------------------------------------- */

// Loeb sisendid ja aastapõhised parameetrid ühte objekti
function readRevenueContext() {
  var c = {};
  c.eur = getFieldFloatValue("eur");
  var tfp = document.getElementById("taxfree_period");
  c.i = tfp.options[tfp.selectedIndex].value; // maksuvaba tulu periood: "1" (kuus) või "12" (aastas)

  var p = getPeriodInfo();
  c.workhours = p.workhours;
  c.nper = p.nper;

  c.year = getCheckedYear();
  c.itr = getIncomeTaxRate(c.year);
  c.socialtaxMin = getSocialTaxMin(c.year);
  c.tfYearDefault = getTaxFreeYearDefault(c.year);
  c.str = SOCIALTAX_RATE;

  c.uip1 = document.getElementById("ui1_x").checked ? 0.008 : 0; // tööandja töötuskindlustus
  c.uip2 = document.getElementById("ui2_x").checked ? 0.016 : 0; // töötaja töötuskindlustus
  c.fp1 = document.getElementById("pension_x").checked ? 0.02 : 0; // kogumispension

  c.socialtaxX = document.getElementById("socialtax_x").checked === true;
  c.in1 = document.getElementById("input_1").checked === true;
  c.in2 = document.getElementById("input_2").checked === true;
  c.in3 = document.getElementById("input_3").checked === true;
  return c;
}

// input_1: tööandja kulust brutotulu
function annualRevenueFromEmployerCost(c) {
  if (c.socialtaxX && c.eur * c.workhours < c.socialtaxMin) return 0;
  if (c.socialtaxX && c.eur * c.workhours < (c.socialtaxMin / c.str) * (1 + c.str + 1 * c.uip1)) {
    return round((((c.eur * c.workhours - c.socialtaxMin) / (1 + 1 * c.uip1)) * 12) / c.nper, 2);
  }
  return round((((c.eur * c.workhours) / (1 + c.str + 1 * c.uip1)) * 12) / c.nper, 2);
}

// input_2: brutopalgast brutotulu
function annualRevenueFromGross(c) {
  return round((c.eur * c.workhours * 12) / c.nper, 2);
}

// input_3: netotulust brutotulu (maksuvaba tulu sõltub brutotulust, seega lahendatakse X)
function annualRevenueFromNet(c) {
  var n; // maksuvaba tulu (kohandatud perioodile)
  var X = round(
    ((c.eur * c.workhours * 12) / c.nper / (1 - c.itr) - 25200 * (1 - (c.fp1 + 1 * c.uip2))) /
      (-(9 / 5) * (1 - (c.fp1 + 1 * c.uip2)) - 1 + 1 / (1 - c.itr)),
    2
  );
  if (X < 0) n = 0;
  else if (
    ((c.eur * c.workhours * 12) / c.nper) * (1 - (c.fp1 + 1 * c.uip2)) < c.tfYearDefault &&
    X > c.tfYearDefault
  )
    n = c.eur * c.workhours;
  else if (X > c.tfYearDefault) n = (c.tfYearDefault * c.nper) / 12;
  else n = round((X * c.nper) / 12, 2);
  var incomeTaxRate =
    (c.eur * c.workhours * (1 - (1 * c.fp1 + 1 * c.uip2)) * 12) / c.nper - n <= 0 ? 0 : c.itr;
  return round(
    (round(
      ((c.eur * c.workhours - 1 * n) / (1 - incomeTaxRate) + 1 * n) / (1 - (1 * c.fp1 + 1 * c.uip2)),
      2
    ) *
      12) /
      c.nper,
    2
  );
}

// Arvutab annual_revenue välja väärtuse (null = tühjendada)
function calcAnnualRevenue(c) {
  if (document.getElementById("taxfree_x").checked !== true) return null;
  if (c.in1) return annualRevenueFromEmployerCost(c);
  if (c.in2) return annualRevenueFromGross(c);
  if (c.in3) return annualRevenueFromNet(c);
  return undefined; // ükski režiim pole valitud: välja ei muudeta
}

// Arvutab taxfree_sum välja väärtuse; undefined = välja ei muudeta
function calcTaxFreeSumFromRevenue(c, annualRevenueValue) {
  var insurance = 1 - (1 * c.fp1 + 1 * c.uip2);
  if (annualRevenueValue > 25200 && c.year < 2026) return round(0, 2);
  if (annualRevenueValue * insurance < c.tfYearDefault) {
    if (c.in3) return round((((c.eur * c.workhours * 12) / c.nper) * c.i) / 12, 2);
    if (c.in2) return round((((c.eur * c.workhours * insurance * 12) / c.nper) * c.i) / 12, 2);
    if (c.in1) {
      if (c.socialtaxX && c.eur * c.workhours < (c.socialtaxMin / c.str) * (1 + c.str + 1 * c.uip1)) {
        return round(
          (((((c.eur * c.workhours - c.socialtaxMin) / (1 + 1 * c.uip1)) * insurance * 12) / c.nper) * c.i) / 12,
          2
        );
      }
      return round(
        (((((c.eur * c.workhours) / (1 + c.str + 1 * c.uip1)) * insurance * 12) / c.nper) * c.i) / 12,
        2
      );
    }
    return undefined;
  }
  if (annualRevenueValue < 14400 || c.year >= 2026) return round((c.tfYearDefault * c.i) / 12, 2);
  return round(
    (round(c.tfYearDefault - (c.tfYearDefault * (annualRevenueValue - 14400)) / 10800, 2) * c.i) / 12,
    2
  );
}

function revenueCalc() {
  var ubiPerMonth = getFieldFloatValue("ubi-amount");
  document.getElementById("ubiPerYear").value = 12 * ubiPerMonth;
  updateUbiChildPerYear();

  var c = readRevenueContext();
  var annual_revenue = document.getElementById("annual_revenue");
  var tfs = document.getElementById("taxfree_sum");

  var revenue = calcAnnualRevenue(c);
  if (revenue !== undefined) annual_revenue.value = revenue;

  // NB: loetakse välja väärtus tagasi (sõnena), nagu varem
  var tfsValue = calcTaxFreeSumFromRevenue(c, annual_revenue.value);
  if (tfsValue !== undefined) tfs.value = tfsValue;
}


/* ---------------------------------------------------------------------------
 * 7. wageCalc: palgakalkulatsioon (tavaline ja UBI-variant) ja protsendid
 *
 *    Samm-sammuline arvutus; vahetulemused jäävad DOM-i väljadesse:
 *      readWageContext -> calcTaxFreeMinimum -> calcGrossWage -> calcSocialTax
 *      -> calcInsuranceAndPension -> calcIncomeTax -> calcUbiTaxFields
 *      -> calcNetWage -> applyTaxScenario -> calcWageFund
 *      -> calcGrossTaxAndBurden -> calcChartValues -> calcPercentages
 *    Järjekord on oluline: hilisemad sammud loevad varasemate sammude väljakirjutatud väärtusi.
 * ------------------------------------------------------------------------- */

// Loeb sisendid, aastapõhised parameetrid ja märkeruutude seisu ühte objekti
function readWageContext() {
  var c = {};
  c.eur = getFieldFloatValue("eur");

  // kodanikupalga sisendid
  c.ubiPerMonth = getFieldFloatValue("ubi-amount"); // nimisumma
  c.ubiAdult = getAdultUbiMonthly(c.ubiPerMonth); // täiskasvanu tegelik kodanikupalk (0, kui täiskasvanud pole sihtrühmas)
  byId("ubi").innerHTML = c.ubiAdult;
  byId("ubiPerYear").value = 12 * c.ubiPerMonth;
  updateUbiChildPerYear();
  c.newFlatTax = byId("newFlatTax").innerHTML; // sõne, % (uus ühtne tulumaks)
  c.addedTax = byId("addedTax").innerHTML; // sõne, % (lisanduv ühtekuuluvusmaks)

  var p = getPeriodInfo();
  c.workhours = p.workhours;
  c.period = p.period;
  c.nper = p.nper;
  c.annualRevenue = getFieldFloatValue("annual_revenue");

  c.year = getCheckedYear();
  if (c.year === undefined) c.year = getYear();

  c.tfYearDefault = getTaxFreeYearDefault(c.year);
  c.tfMonthDefault = c.tfYearDefault / 12;
  byId("tfm").innerHTML = c.tfMonthDefault;

  var tfp = byId("taxfree_period");
  c.i = tfp.options[tfp.selectedIndex].value; // maksuvaba tulu periood: "1" või "12"
  c.tfs1 =
    getFieldFloatValue("taxfree_sum") / c.i > c.tfMonthDefault
      ? c.tfMonthDefault * c.i
      : getFieldFloatValue("taxfree_sum") / c.i;

  c.socialtaxMin = getSocialTaxMin(c.year);
  c.itr = getIncomeTaxRate(c.year); // tulumaksumäär
  c.loc = 0.1196; // maksutulu kohalikele omavalitsustele: 1. jaanuarist 2020 11,96% (TuMS §5)
  c.str = SOCIALTAX_RATE;

  // töötuskindlustusmakse määrad (UIP): tööandja 0,8%, töötaja 1,6%
  var uip1 = 0.008;
  byId("ui1").innerHTML = round(uip1 * 100, 1);
  var uip2 = 0.016;
  byId("ui2").innerHTML = round(uip2 * 100, 1);
  c.uip1 = byId("ui1_x").checked ? uip1 : 0;
  c.uip2 = byId("ui2_x").checked ? uip2 : 0;

  // kogumispension: fp1 = 2% palgast, fp2 = 4% sotsiaalmaksust
  var pensionX = byId("pension_x").checked;
  c.fp1 = pensionX ? 0.02 : 0;
  c.fp2 = pensionX ? getFundedPensionFromSocialTax(c.year) : 0;

  c.taxfreeX = byId("taxfree_x").checked;
  c.socialtaxX = byId("socialtax_x").checked === true;
  c.in1 = byId("input_1").checked === true;
  c.in2 = byId("input_2").checked === true;
  c.in3 = byId("input_3").checked === true;
  c.hh = readHousehold(c);
  return c;
}

// Maksuvaba tulu (tfm) ja sellest lähtuv maksuvaba osa (taxfree)
function calcTaxFreeMinimum(c) {
  var tfm2018;
  if (byId("F1").checked) {
    if ((c.tfs1 * c.nper) / c.i > (c.tfMonthDefault * c.nper) / c.i) tfm2018 = c.tfMonthDefault;
    else if (c.tfs1 < 0) tfm2018 = 0;
    else tfm2018 = round(c.tfs1 * c.nper, 2);
  } else if (byId("F2").checked) {
    if (c.annualRevenue > 25200 && c.year < 2026) tfm2018 = 0;
    else if (c.annualRevenue < 14400 || c.year >= 2026) tfm2018 = (c.tfYearDefault * c.nper) / 12;
    else
      tfm2018 = round(
        (round(c.tfYearDefault - (c.tfYearDefault * (c.annualRevenue - 14400)) / 10800, 2) * c.nper) / 12,
        2
      );
  }

  c.tfm = tfm2018 * 1;
  byId("tfm").innerHTML = c.taxfreeX ? c.tfm : 0;
  c.taxfree = c.taxfreeX ? c.tfm : 0;
}

// UBI-variandi brutopalk "netotulu" režiimis (input_3); mõlemad maksustsenaariumid
function calcGrossWageUbiFromNet(c) {
  var grosswage_ubi = byId("grosswage_ubi");
  getTaxScenarios().forEach((variant) => {
    if (variant.checked === true && variant.value == 2) {
      // variant 2: üks ja ainus tulumaks
      grosswage_ubi.innerHTML = round(
        (c.sum - c.ubiAdult) / (1 - c.newFlatTax / 100 - (c.fp1 + c.uip2)),
        2
      );
    } else {
      // variant 1: ühtekuuluvusmaks + tulumaks
      // (kontrollarvutus: kui neto on 1000 ja ubi 362, ühtekuuluvusmaks 28.32% ja tulumaks nagu on, siis bruto peab olema 1079,897999820151)
      var oneMinusAddedTaxRate = 1 - c.addedTax / 100;
      var oneMinusInsuranceTotalRate = 1 - (c.fp1 + c.uip2);
      var taxFreePlusAddedTax = c.taxfree * oneMinusAddedTaxRate;
      var initialReduction = c.sum - c.ubiAdult - taxFreePlusAddedTax;
      var taxTotalStuff = 1 - (c.addedTax / 100 + c.incomeTaxRate);
      grosswage_ubi.innerHTML = round(
        (initialReduction / taxTotalStuff + c.taxfree) / oneMinusInsuranceTotalRate,
        2
      );
    }
  });
}

// Brutopalk valitud sisendirežiimi järgi; seab ka i3 (netotulu režiim)
function calcGrossWage(c) {
  var grosswage = byId("grosswage");
  var i3checked = false;

  if (c.in1) {
    // tööandja kulust
    if (c.socialtaxX && c.sum < c.socialtaxMin) grosswage.value = "NaN";
    else if (c.socialtaxX && c.sum < (c.socialtaxMin / c.str) * (1 + c.str + 1 * c.uip1))
      grosswage.value = round((c.sum - c.socialtaxMin) / (1 + 1 * c.uip1), 2);
    else grosswage.value = round(c.sum / (1 + c.str + 1 * c.uip1), 2);
  } else if (c.in2) {
    grosswage.value = round(c.sum, 2);
  } else if (c.in3) {
    i3checked = true;
    grosswage.value = round(
      ((c.sum - c.taxfree) / (1 - c.incomeTaxRate) + c.taxfree) / (1 - (c.fp1 + 1 * c.uip2)),
      2
    );
    calcGrossWageUbiFromNet(c);
  }

  netWageFirst(i3checked);

  writeValues(grosswage.id, grosswage.value);
  if (i3 === true) writeValues(byId("grosswage_ubi").id, byId("grosswage_ubi").innerHTML);
}

// Sotsiaalmaks (miinimumkuumääraga)
function calcSocialTax(c) {
  var socialtax = byId("socialtax");
  var socialtax_ubi = byId("socialtax_ubi");
  var grosswage = byId("grosswage");
  var grosswage_ubi = byId("grosswage_ubi");

  if (c.in1 && c.socialtaxX && c.sum < c.socialtaxMin) socialtax.value = "NaN";
  else if (c.in1 && c.socialtaxX && c.sum < (c.socialtaxMin / c.str) * (1 + c.str + 1 * c.uip1))
    socialtax.value = round(c.socialtaxMin, 2);
  else if (
    c.socialtaxX &&
    (grosswage.value * c.str < c.socialtaxMin || grosswage_ubi.innerHTML * c.str < c.socialtaxMin)
  ) {
    if (grosswage.value * c.str < c.socialtaxMin) socialtax.value = round(c.socialtaxMin, 2);
    if (grosswage_ubi.innerHTML * c.str < c.socialtaxMin && i3 === true)
      socialtax_ubi.innerHTML = round(c.socialtaxMin, 2);
  } else {
    socialtax.value = round(grosswage.value * c.str, 2);
    if (i3 === true) socialtax_ubi.innerHTML = round(grosswage_ubi.innerHTML * c.str, 2);
  }
  writeValues(socialtax.id, socialtax.value);
  if (i3 === true) writeValues(socialtax_ubi.id, socialtax_ubi.innerHTML);
}

// Töötuskindlustusmaksed ja kogumispensioni makse
function calcInsuranceAndPension(c) {
  var grosswage = byId("grosswage");
  var grosswage_ubi = byId("grosswage_ubi");
  var ui_employer = byId("ui_employer");
  var ui_employer_ubi = byId("ui_employer_ubi");
  var ui_employee = byId("ui_employee");
  var ui_employee_ubi = byId("ui_employee_ubi");
  var fpp_1 = byId("fpp_1");
  var fpp_1_ubi = byId("fpp_1_ubi");

  ui_employer.value = round(grosswage.value * 1 * c.uip1, 2);
  writeValues(ui_employer.id, ui_employer.value);
  if (i3 === true) {
    ui_employer_ubi.innerHTML = round(grosswage_ubi.innerHTML * 1 * c.uip1, 2);
    writeValues(ui_employer_ubi.id, ui_employer_ubi.innerHTML);
  }
  ui_employee.value = round(grosswage.value * 1 * c.uip2, 2);
  writeValues(ui_employee.id, ui_employee.value);
  if (i3 === true) {
    ui_employee_ubi.innerHTML = round(grosswage_ubi.innerHTML * 1 * c.uip2, 2);
    writeValues(ui_employee_ubi.id, ui_employee_ubi.innerHTML);
  }
  fpp_1.value = round(grosswage.value * c.fp1, 2);
  writeValues(fpp_1.id, fpp_1.value);
  if (i3 === true) {
    fpp_1_ubi.innerHTML = round(grosswage_ubi.innerHTML * c.fp1, 2);
    writeValues(fpp_1_ubi.id, fpp_1_ubi.innerHTML);
  }
}

// Tulumaks
function calcIncomeTax(c) {
  var grosswage = byId("grosswage");
  var grosswage_ubi = byId("grosswage_ubi");
  var ui_employee = byId("ui_employee");
  var ui_employee_ubi = byId("ui_employee_ubi");
  var fpp_1 = byId("fpp_1");
  var fpp_1_ubi = byId("fpp_1_ubi");
  var incometax = byId("incometax");
  var incometax_ubi = byId("incometax_ubi");

  if (
    grosswage.value < c.taxfree + grosswage.value * (1 * c.uip2 + c.fp1) ||
    (i3 === true && grosswage_ubi.innerHTML < c.taxfree + grosswage_ubi.innerHTML * (1 * c.uip2 + c.fp1))
  ) {
    incometax.value = round(0, 2);
    if (i3 === true) incometax_ubi.innerHTML = round(0, 2);
  } else {
    incometax.value = round((grosswage.value - ui_employee.value - fpp_1.value - c.taxfree) * c.itr, 2);
    if (i3 === true)
      incometax_ubi.innerHTML = round(
        (grosswage_ubi.innerHTML - ui_employee_ubi.innerHTML - fpp_1_ubi.innerHTML - c.taxfree) * c.itr,
        2
      );
  }
  writeValues(incometax.id, incometax.value);
  if (i3 === true) writeValues(incometax_ubi.id, incometax_ubi.innerHTML);
}

// Kodanikupalga lisamaksu (ubicontrib) ja uue ühtse tulumaksu (flatincometax) summad
function calcUbiTaxFields(c) {
  var grosswage_ubi = byId("grosswage_ubi");
  byId("ubicontrib").innerHTML = round((grosswage_ubi.innerHTML * c.addedTax) / 100, 2);
  byId("flatincometax").innerHTML = round(grosswage_ubi.innerHTML * (c.newFlatTax / 100), 2);
}

// Netopalk
function calcNetWage(c) {
  var netwage = byId("netwage");
  netwage.innerHTML = round(
    byId("grosswage").value - byId("ui_employee").value - byId("fpp_1").value - byId("incometax").value,
    2
  );
  writeValues(netwage.id, netwage.innerHTML);
}

function getTaxScenarios() {
  return document.getElementsByName("taxscenario");
}

// Töötaja neto kodanikupalga variandis ja tabeliridade esiletõstmine valitud maksustsenaariumi järgi
// (variant 1: ühtekuuluvusmaks + tulumaks; variant 2: üks ja ainus tulumaks)
function applyTaxScenario(c) {
  var grosswage = byId("grosswage");
  var grosswage_ubi = byId("grosswage_ubi");
  var ui_employee = byId("ui_employee");
  var fpp_1 = byId("fpp_1");
  var netwage = byId("netwage");
  var workNetWage = byId("worknetwage");
  var newFlatTaxField = byId("flatincometax");
  var addedTaxField = byId("ubicontrib");
  var row_incometax1 = byId("incometax1");
  var row_incometax2 = byId("incometax2");
  var row_cohesiontax = byId("cohesiontax");

  getTaxScenarios().forEach((variant) => {
    if (variant.checked === true && variant.value == 2) {
      if (i3 === true) {
        console.log(c.sum);
        console.log(c.ubiPerMonth);
        console.log(grosswage_ubi.innerHTML);
        console.log(c.newFlatTax);
        console.log(grosswage_ubi.innerHTML);
      } else {
        workNetWage.innerHTML = round(
          grosswage.value - ui_employee.value - fpp_1.value - newFlatTaxField.innerHTML,
          2
        );
      }
      setMuted(row_incometax1, true);
      setMuted(row_cohesiontax, true);
      setMuted(row_incometax2, false);
    } else {
      if (i3 === true) {
        workNetWage.innerHTML = c.sum - c.ubiAdult;
      } else {
        workNetWage.innerHTML = round(netwage.innerHTML - addedTaxField.innerHTML, 2);
      }
      setMuted(row_incometax1, false);
      setMuted(row_cohesiontax, false);
      setMuted(row_incometax2, true);
    }
  });
}

// Palgafond (tööandja kulu kokku) ja töötaja kogu neto (palk + kodanikupalk)
function calcWageFund(c) {
  var grosswage = byId("grosswage");
  var ui_employer = byId("ui_employer");
  var socialtax = byId("socialtax");
  var wagefund = byId("wagefund");
  var totalNet = byId("totalnet");

  wagefund.value = round(1 * grosswage.value + 1 * ui_employer.value + 1 * socialtax.value, 2);

  if (i3 === true) {
    var wagefund_ubi = byId("wagefund_ubi");
    var wagefund_std = byId("wagefund_std");
    totalNet.innerHTML = round(parseFloat(c.sum), 2);
    wagefund_ubi.innerHTML = round(
      1 * byId("grosswage_ubi").innerHTML + 1 * byId("ui_employer_ubi").innerHTML + 1 * byId("socialtax_ubi").innerHTML,
      2
    );
    writeValues(wagefund_ubi.id, wagefund_ubi.innerHTML);
    wagefund_std.innerHTML = round(
      1 * byId("grosswage_std").innerHTML + 1 * byId("ui_employer_std").innerHTML + 1 * byId("socialtax_std").innerHTML,
      2
    );
    writeValues(wagefund_std.id, wagefund_std.innerHTML);
  } else {
    totalNet.innerHTML = round(parseFloat(byId("worknetwage").innerHTML) + parseFloat(c.ubiAdult), 2);
    writeValues(wagefund.id, wagefund.value);
  }
}

// Maksukoormus: bruto miinus neto (tavaline ja kodanikupalga variant)
function calcGrossTaxAndBurden(c) {
  var wageBase = byId("pct1").checked === true; // 100% = palgafond, muidu brutopalk
  var usedWage = wageBase ? byId("wagefund").value : byId("grosswage").value;
  var usedWageUbi = wageBase ? byId("wagefund_ubi").innerHTML : byId("grosswage_ubi").innerHTML;

  var grossTax = byId("grosstax");
  var grossTaxStd = byId("grosstax_std");
  var taxBurden = byId("taxburden");
  var taxBurdenStd = byId("taxburden_std");

  grossTax.innerHTML = round(usedWageUbi - byId("worknetwage").innerHTML, 2);
  grossTaxStd.innerHTML = round(usedWage - byId("netwage").innerHTML, 2);
  taxBurdenStd.innerHTML = round(grossTaxStd.innerHTML - byId("ubi_std").innerHTML, 2);
  taxBurden.innerHTML = round(usedWageUbi - byId("totalnet").innerHTML, 2);
}

// Sektordiagrammide väärtused (kohalik omavalitsus, riik, kogumispension, töötaja)
function calcChartValues(c) {
  var grosswage = byId("grosswage");
  var grosswage_ubi = byId("grosswage_ubi");
  var ui_employer = byId("ui_employer");
  var ui_employee = byId("ui_employee");
  var socialtax = byId("socialtax");
  var incometax = byId("incometax");
  var localtaxes = byId("localtaxes");
  var taxes = byId("taxes");
  var pension = byId("pension");
  var ubiPerMonth = c.ubiAdult; // täiskasvanu tegelik kodanikupalk

  localtaxes.value = round(grosswage.value * c.loc, 2); // KOV-i osa
  pension.value = round(grosswage.value * (c.fp1 + c.fp2), 2);
  taxes.value = round(
    1 * ui_employer.value +
      1 * ui_employee.value +
      1 * socialtax.value +
      1 * incometax.value -
      1 * grosswage.value * c.fp2 -
      1 * localtaxes.value,
    2
  );

  var ui_employer_ubi = byId("ui_employer_ubi");
  var ui_employee_ubi = byId("ui_employee_ubi");
  var socialtax_ubi = byId("socialtax_ubi");
  var incometax_ubi = byId("incometax_ubi");
  var addedTaxField = byId("ubicontrib");
  var localtaxes_ubi = byId("localtaxes_ubi");
  var taxes_ubi = byId("taxes_ubi");
  var pension_ubi = byId("pension_ubi");
  var ubiamount = byId("ubiamount");
  var workernet = byId("workernet");
  var totalNet = byId("totalnet");

  localtaxes_ubi.value = round(1 * grosswage_ubi.innerHTML * c.loc, 2);
  pension_ubi.value = round(grosswage_ubi.innerHTML * (c.fp1 + c.fp2), 2);
  var tuv = round(
    1 * ui_employer_ubi.innerHTML +
      1 * ui_employee_ubi.innerHTML +
      1 * socialtax_ubi.innerHTML +
      1 * incometax_ubi.innerHTML -
      1 * grosswage_ubi.innerHTML * c.fp2 -
      1 * localtaxes_ubi.value +
      1 * addedTaxField.innerHTML,
    2
  );

  taxes_ubi.value = tuv - ubiPerMonth < 0 ? 0 : tuv - ubiPerMonth;
  ubiamount.value = ubiPerMonth - tuv < 0 ? 0 : ubiPerMonth - tuv;
  workernet.value = totalNet.innerHTML - ubiamount.value;
  byId("ubi-chart").innerHTML = ubiPerMonth;
  byId("grosswage-chart").innerHTML = grosswage_ubi.innerHTML;
  byId("grosswage-chart-std").innerHTML = grosswage.value;
  // diagrammid jäävad ühe täiskasvanu kohta ka siis, kui tulemustabel näitab leibkonda (vt applyHousehold)
  var chartNetWage = byId("netwage_chart");
  if (chartNetWage !== null) chartNetWage.value = byId("netwage").innerHTML;

  console.log("localtaxes " + localtaxes.value);
  console.log("localtaxes ubi " + localtaxes_ubi.value);
  console.log("taxes " + taxes.value);
  console.log("employer " + ui_employer_ubi.innerHTML);
  console.log("employee " + ui_employee_ubi.innerHTML);
  console.log("socialtax ubi " + socialtax_ubi.innerHTML);
  console.log("incometax ubi " + incometax_ubi.innerHTML);
  console.log("grosswage ubi " + grosswage_ubi.innerHTML);
  console.log("addedtaxfield " + addedTaxField.innerHTML);
  console.log("ubipermonth " + ubiPerMonth);
  console.log("taxes ubi " + taxes_ubi.value);
  console.log("pension " + pension.value);
  console.log("pension ubi " + pension_ubi.value);
}

// Protsent: 100 * osa / alus, kahe komakohaga
function pct(part, base) {
  return round((100 * part) / base, 2);
}

/*
  Protsendiveerud. Kolm varianti erinevad ainult selle poolest, mida loetakse 100 protsendiks:
    den.std      - tavavariandi (std) veergude alus
    den.ubi      - kodanikupalga (ubi) veergude alus
    den.mixedUbi - lisamaksu, tulumaksu jm kodanikupalga rea väljade alus
    den.mixedStd - bruto maksukoormuse, UBI ja maksukoormuse std-väljade alus
    den.incomeTaxUbi - kas incometax_pct_ubi arvutatakse (ainult brutopalga baasil)
    den.zeroGuard    - socialtax_pct tühja väärtuse asendus 0-ga (ainult palgafondi baasil)
    den.hh           - leibkond (readHousehold): täiskasvanute arv korrutab kõik ühe täiskasvanu summad,
                       netotulu ridadele lisanduvad laste raha (childStd / childUbi).
                       Ühe täiskasvanu ja ilma lasteta (vaikimisi) on tulemus sama mis varem.
*/
function writePercents(den) {
  var hh = den.hh;
  var K = hh.adults;
  var socialtax_pct = byId("socialtax_pct");
  var grosswage_pct = byId("grosswage_pct");
  var ui_employer_pct = byId("ui_employer_pct");
  var ui_employee_pct = byId("ui_employee_pct");
  var fpp_1_pct = byId("fpp_1_pct");
  var incometax_pct = byId("incometax_pct");
  var netwage_pct = byId("netwage_pct");
  var wagefund_pct = byId("wagefund_pct");

  // tavavariant
  socialtax_pct.value = pct(K * byId("socialtax").value, den.std);
  if (den.zeroGuard) socialtax_pct.value = socialtax_pct.value || 0;
  writeValues(socialtax_pct.id, socialtax_pct.value);
  grosswage_pct.value = pct(K * byId("grosswage").value, den.std);
  writeValues(grosswage_pct.id, grosswage_pct.value);
  ui_employer_pct.value = pct(K * byId("ui_employer").value, den.std);
  writeValues(ui_employer_pct.id, ui_employer_pct.value);
  ui_employee_pct.value = pct(K * byId("ui_employee").value, den.std);
  writeValues(ui_employee_pct.id, ui_employee_pct.value);
  fpp_1_pct.value = pct(K * byId("fpp_1").value, den.std);
  writeValues(fpp_1_pct.id, fpp_1_pct.value);
  incometax_pct.value = pct(K * byId("incometax").value, den.std);
  writeValues(incometax_pct.id, incometax_pct.value);
  netwage_pct.innerHTML = pct(K * byId("netwage").innerHTML, den.std);
  writeValues(netwage_pct.id, netwage_pct.innerHTML);
  // "Netotulu kokku" (std): leibkonnas lisanduvad lastele makstavad toetused (writeValues kopeeris ülemise rea väärtuse)
  if (hh.childStd > 0) byId("netwage_pct_std").innerHTML = pct(K * byId("netwage").innerHTML + hh.childStd, den.std);
  wagefund_pct.value = pct(K * byId("wagefund").value, den.std);
  writeValues(wagefund_pct.id, wagefund_pct.value);

  // kodanikupalga variant
  byId("wagefund_pct_ubi").innerHTML = pct(K * byId("wagefund_ubi").innerHTML, den.ubi);
  byId("socialtax_pct_ubi").innerHTML = pct(K * byId("socialtax_ubi").innerHTML, den.ubi);
  byId("ui_employer_pct_ubi").innerHTML = pct(K * byId("ui_employer_ubi").innerHTML, den.ubi);
  byId("ui_employee_pct_ubi").innerHTML = pct(K * byId("ui_employee_ubi").innerHTML, den.ubi);
  byId("grosswage_pct_ubi").innerHTML = pct(K * byId("grosswage_ubi").innerHTML, den.ubi);
  byId("fpp_1_pct_ubi").innerHTML = pct(K * byId("fpp_1_ubi").innerHTML, den.ubi);
  if (den.incomeTaxUbi) byId("incometax_pct_ubi").innerHTML = pct(K * byId("incometax_ubi").innerHTML, den.ubi);
  byId("ubicontrib_pct").innerHTML = pct(K * byId("ubicontrib").innerHTML, den.mixedUbi);
  byId("flatincometax_pct").innerHTML = pct(K * byId("flatincometax").innerHTML, den.mixedUbi);
  byId("worknetwage_pct").innerHTML = pct(K * byId("worknetwage").innerHTML, den.mixedUbi);
  var totalNet = byId("totalnet");
  var netwage = byId("netwage");
  byId("diff").innerHTML = round((K * totalNet.innerHTML + hh.ubiExtra) / (K * netwage.innerHTML + hh.childStd), 2);
  console.log(totalNet.innerHTML + "/" + netwage.innerHTML);
  byId("totalnet_pct").innerHTML = pct(K * totalNet.innerHTML + hh.ubiExtra, den.mixedUbi);
  byId("grosstax_pct").innerHTML = pct(K * byId("grosstax").innerHTML, den.mixedUbi);
  byId("taxburden_pct").innerHTML = pct(K * byId("taxburden").innerHTML - hh.ubiExtra, den.mixedUbi);
  byId("grosstax_pct_std").innerHTML = pct(K * byId("grosstax_std").innerHTML, den.mixedStd);
  byId("ubi_pct").innerHTML = pct(K * byId("ubi").innerHTML + hh.ubiExtra, den.mixedStd);
  // "Riigilt tagasi" std veerg: protsent ainult siis, kui lastele makstakse senise korra järgi midagi (muidu tühi, nagu varem)
  byId("ubi_pct_std").innerHTML = hh.childStd > 0 ? pct(hh.childStd, den.mixedStd) : "";
  byId("taxburden_pct_std").innerHTML = pct(K * getFieldFloatValue("taxburden_std") - hh.childStd, den.mixedStd);
}

// Valib protsendiveergude aluse (pct1 = palgafond, pct2 = brutopalk, pct3 = netotulu).
// Alused on leibkonna kohta (K * ühe täiskasvanu väärtus; netotulul ka laste raha).
function calcPercentages(c) {
  var hh = c.hh;
  var K = hh.adults;
  if (byId("pct1").checked === true) {
    var wagefundValue = K * byId("wagefund").value;
    writePercents({
      std: wagefundValue,
      ubi: K * byId("wagefund_ubi").innerHTML,
      mixedUbi: wagefundValue,
      mixedStd: wagefundValue,
      incomeTaxUbi: false,
      zeroGuard: true,
      hh: hh,
    });
  }
  if (byId("pct2").checked === true) {
    // Ajalugu: lisamaksu ja uue ühtse tulumaksu protsendi aluseks võeti grosswage_ubi; see ühtlustas
    // protsendi lehe ülaosas ja tabelis (enne oli tabelis väiksem).
    writePercents({
      std: K * byId("grosswage").value,
      ubi: K * byId("grosswage_ubi").innerHTML,
      mixedUbi: K * byId("grosswage_ubi").innerHTML,
      mixedStd: K * byId("grosswage").value,
      incomeTaxUbi: true,
      zeroGuard: false,
      hh: hh,
    });
  }
  if (byId("pct3").checked === true) {
    // Ajalugu: kodanikupalga ja segaväljade alus oli enne netwage, nüüd totalNet (töötaja kogu neto).
    // Leibkonnas on alus kogu leibkonna neto: tööandjalt saadu + laste raha.
    var totalNetValue = K * byId("totalnet").innerHTML + hh.ubiExtra;
    writePercents({
      std: K * byId("netwage").innerHTML + hh.childStd,
      ubi: totalNetValue,
      mixedUbi: totalNetValue,
      mixedStd: totalNetValue,
      incomeTaxUbi: false,
      zeroGuard: false,
      hh: hh,
    });
  }
}

/* ---------------------------------------------------------------------------
 * 7b. LEIBKOND tulemustabelis: märkeruut "2 täiskasvanut" (adults2_x) ja laste arv (children_count)
 *
 *    wageCalc arvutab alati ühe täiskasvanu väärtused (nagu varem). Leibkonna vaade lisandub
 *    selle peale: protsendid arvutatakse leibkonna summadest (writePercents) ja pärast seda
 *    kirjutab applyHousehold tabeli eurod üle:
 *      - eurod * täiskasvanute arv (1 või 2; mõlemal sama tulu)
 *      - Netotulu kokku, senise korra järgi: + lastetoetus ja suurpere toetus (CHILD_BENEFITS)
 *      - Netotulu kokku, kodanikupalgaga: + laste kodanikupalk (laste arv * lapse summa) ja säilinud
 *        suurperetoetus (kui lapsetoetuste kärbe pole märgitud, vt isLargeFamilyBenefitKept)
 *      - "Riigilt tagasi" ja "Tegelik (neto) maksukoormus" ridadel samad lisandused
 *    Üks täiskasvanu ja 0 last (vaikimisi): tabelit ei muudeta.
 *    Diagrammid jäävad ühe täiskasvanu kohta (nende väärtused salvestab calcChartValues).
 *
 *    NB: tulemustabeli spanid on ka arvutuse vahemälu (hilisemad sammud loevad neid), seepärast
 *    salvestatakse ühe täiskasvanu väärtused (personValues) ja taastatakse enne järgmist arvutust.
 * ------------------------------------------------------------------------- */

// Spanid, mille väärtus korrutatakse täiskasvanute arvuga
var HOUSEHOLD_SCALED_FIELDS = [
  "wagefund_std", "wagefund_ubi", "socialtax_std", "socialtax_ubi",
  "ui_employer_std", "ui_employer_ubi", "grosswage_std", "grosswage_ubi",
  "fpp_1_std", "fpp_1_ubi", "ui_employee_std", "ui_employee_ubi",
  "incometax_std", "incometax_std_2", "incometax_ubi", "ubicontrib", "flatincometax",
  "netwage", "worknetwage", "grosstax_std", "grosstax",
];

// Spanid, mille väärtuses on ka laste raha (kirjutatakse eraldi)
var HOUSEHOLD_NET_FIELDS = ["netwage_std", "totalnet", "ubi", "ubi_std", "taxburden_std", "taxburden"];

// Loeb leibkonna sisendid. Puuduvad väljad (vana HTML) tähendavad: 1 täiskasvanu, 0 last.
function readHousehold(c) {
  var adultsBox = byId("adults2_x");
  var countField = byId("children_count");
  var children = countField !== null ? parseInt(countField.value, 10) : 0;
  if (!(children > 0)) children = 0; // tühi, NaN või negatiivne -> 0
  var hh = {
    adults: adultsBox !== null && adultsBox.checked === true ? 2 : 1,
    children: children,
    allowance: 0, // lapsetoetus kuus (senine kord)
    largeFamily: 0, // suurpere toetus kuus (senine kord)
    childStd: 0, // laste raha kuus senise korra järgi
    childUbiOn: false, // kas lapsed kuuluvad kodanikupalga sihtrühma (märkeruut "child")
    childUbiEach: 0, // kodanikupalk ühele lapsele kuus
    childUbi: 0, // laste kodanikupalk kuus kokku
    keepsOldBenefits: false, // lapsed pole sihtrühmas: senine perehüvitiste süsteem jätkub (lapsetoetus + suurperetoetus)
    allowanceKept: 0, // kodanikupalga korra korral säilinud lapsetoetus kuus (ainult kui keepsOldBenefits)
    largeKept: 0, // kodanikupalga korra korral säilinud suurperetoetus kuus (vt isLargeFamilyBenefitKept)
    ubiExtra: 0, // laste kodanikupalk + säilinud perehüvitised: riigilt laekuv raha lisaks täiskasvanute kodanikupalgale
  };
  if (children > 0) {
    var benefits = getChildBenefits(c.year, children);
    hh.allowance = benefits.allowance;
    hh.largeFamily = benefits.largeFamily;
    hh.childStd = benefits.total;
    hh.childUbiOn = isChildGroupTargeted();
    hh.childUbiEach = getChildUbiMonthly(c.ubiPerMonth);
    hh.childUbi = hh.childUbiOn ? children * hh.childUbiEach : 0;
    /*
      Lapsed pole sihtrühmas: nende senised perehüvitised on kärpekohtadena välja lülitatud (toggleCostReducers),
      seega neid ei kärbita ja kodanikupalga korral jätkub laste osas senine süsteem: lapsetoetus ja suurperetoetus
      säilivad täies mahus. Muidu säilib suurperetoetus ainult siis, kui lapsetoetuste kärbe pole märgitud.
    */
    hh.keepsOldBenefits = !hh.childUbiOn;
    hh.allowanceKept = hh.keepsOldBenefits ? hh.allowance : 0;
    hh.largeKept = hh.largeFamily > 0 && (hh.keepsOldBenefits || isLargeFamilyBenefitKept()) ? hh.largeFamily : 0;
    hh.ubiExtra = hh.childUbi + hh.allowanceKept + hh.largeKept;
  }
  return hh;
}

function savePersonValues() {
  personValues = {};
  HOUSEHOLD_SCALED_FIELDS.concat(HOUSEHOLD_NET_FIELDS).forEach(function (id) {
    var el = byId(id);
    if (el !== null) personValues[id] = el.innerHTML;
  });
}

// Taastab ühe täiskasvanu väärtused, kui eelmine arvutus kirjutas tabeli leibkonna väärtustega üle
function restorePersonValues() {
  if (personValues === null) return;
  for (var id in personValues) byId(id).innerHTML = personValues[id];
  personValues = null;
}

// Kirjutab summa (2 komakohta); mittearvuline väärtus (tühi, NaN) jäetakse nagu on
function setAmount(id, value) {
  var el = byId(id);
  if (el !== null && isFinite(value)) el.innerHTML = round(value, 2);
}

// Span -> arv (NaN, kui tühi või mittearvuline)
function spanNumber(id) {
  var el = byId(id);
  return el === null ? NaN : parseFloat(el.innerHTML);
}

function formatEur(value) {
  return round(value, 2);
}

// Selgitus tulemustabeli kohal: mis leibkonna kohta numbrid on ja kust laste raha tuleb
function describeHousehold(hh) {
  var parts = [hh.adults === 2 ? "2 täiskasvanut (mõlemal sama tulu)" : "1 täiskasvanu"];
  if (hh.children > 0) parts.push(hh.children === 1 ? "1 laps" : hh.children + " last");
  var text = "Tulemus leibkonnale: " + parts.join(", ") + ". Summad on kogu leibkonna kohta kuus.";
  if (hh.children > 0) {
    text += " Lastele laekub senise korra järgi " + formatEur(hh.childStd) + " € (lapsetoetus " + formatEur(hh.allowance) + " €";
    if (hh.largeFamily > 0) text += ", suurperetoetus " + formatEur(hh.largeFamily) + " €";
    text += ")";
    if (hh.childUbiOn) {
      text += "; kodanikupalgaga " + hh.children + " × " + formatEur(hh.childUbiEach) + " = " + formatEur(hh.childUbi) + " €";
      if (hh.largeKept > 0) text += ", lisaks säilib suurperetoetus " + formatEur(hh.largeKept) + " €";
    } else {
      text += "; kodanikupalka lastele ei maksta (lapsed pole sihtrühmas), seega senised perehüvitised säilivad";
    }
    text += ".";
  }
  return text;
}

function applyHousehold(c) {
  var hh = c.hh;
  var K = hh.adults;
  var note = byId("household-note");
  var isHousehold = K !== 1 || hh.children > 0;
  if (note !== null) {
    setHidden(note, !isHousehold);
    if (isHousehold) note.innerHTML = describeHousehold(hh);
  }
  var extraLabel = byId("ubi_label_extra");
  if (extraLabel !== null) setHidden(extraLabel, !(hh.childStd > 0));
  if (!isHousehold) return;

  // net- ja maksukoormuse read: arvutatakse ühe täiskasvanu väärtustest, enne kui need üle kirjutatakse
  var net = {
    netStd: K * spanNumber("netwage_std") + hh.childStd,
    totalNet: K * spanNumber("totalnet") + hh.ubiExtra,
    ubi: K * spanNumber("ubi") + hh.ubiExtra,
    burdenStd: K * spanNumber("taxburden_std") - hh.childStd,
    burden: K * spanNumber("taxburden") - hh.ubiExtra,
  };

  savePersonValues();
  HOUSEHOLD_SCALED_FIELDS.forEach(function (id) {
    setAmount(id, K * spanNumber(id));
  });
  setAmount("netwage_std", net.netStd);
  setAmount("totalnet", net.totalNet);
  setAmount("ubi", net.ubi);
  if (hh.childStd > 0) setAmount("ubi_std", hh.childStd);
  setAmount("taxburden_std", net.burdenStd);
  setAmount("taxburden", net.burden);
}

function wageCalc() {
  restorePersonValues();
  var c = readWageContext();
  calcTaxFreeMinimum(c);
  c.sum = c.eur * c.workhours; // arvutuse alus: sisestatud summa
  c.incomeTaxRate = c.sum - c.taxfree <= 0 ? 0 : c.itr;
  calcGrossWage(c);
  calcSocialTax(c);
  calcInsuranceAndPension(c);
  calcIncomeTax(c);
  calcUbiTaxFields(c);
  calcNetWage(c);
  applyTaxScenario(c);
  calcWageFund(c);
  calcGrossTaxAndBurden(c);
  calcChartValues(c);
  calcPercentages(c);
  // Diagrammi mudel koostatakse enne leibkonna ülekirjutust (tabeli spanid on veel ühe täiskasvanu väärtused),
  // joonistatakse pärast. Ilma moodulita (#family-chart puudub) on mudel null ja midagi ei toimu. Vt 10. osa.
  var chartModel = buildFamilyChartModel(c);
  applyHousehold(c);
  renderFamilyChart(chartModel);
  // Lause tulemuse kohta loeb tabeli spane, kuhu applyHousehold on leibkonna väärtused juba kirjutanud. Vt 11. osa.
  renderResultSentence(c);
  // Maksumudeli valik diagrammi juures peegeldab tabeli valikut. Vt 12. osa.
  syncTaxScenarioButtons();
  // Täiendavate kärbete kerimisväli näitab Fabriku välja #all_value_eur_custom praegust väärtust. Vt 13. osa.
  syncCutStepper();
}


/* ---------------------------------------------------------------------------
 * 8. HOIATUS JA ÜLDINE ARVUTUS
 * ------------------------------------------------------------------------- */
function resetAlert() {
  var sta = document.getElementById("socialtaxalert");
  sta.style.display = "none";
}

// Hoiatus, kui sisestatud summa on väiksem sotsiaalmaksu kuumäärast (tööandja kulu režiimis)
function displayAlert() {
  var sum = getFieldFloatValue("eur") * getPeriodInfo().workhours;
  var sta = document.getElementById("socialtaxalert");
  var tooSmall =
    sum * 1 < getSocialTaxMin(getCheckedYear()) &&
    byId("input_1").checked === true &&
    byId("socialtax_x").checked === true;
  sta.style.display = tooSmall ? "block" : "none";
}

function outputCalc() {
  revenueCalc();
  wageCalc();
}

// Maksuvaba tulu / aastatulu väljade lukustus vastavalt valitud raadionupule
function disable() {
  var controlPairs = { F1: "taxfree_sum", F2: "annual_revenue" };
  var disabledClass = "disabled_1 vis input-mini R W120";
  var enabledClass = "vis input-mini R W120";

  for (var i in controlPairs) {
    var toggle = document.getElementById(i);
    var field = document.getElementById(controlPairs[i]);
    if (toggle.checked === true) {
      field.removeAttribute("disabled");
      field.className = enabledClass;
    } else {
      field.setAttribute("disabled", "disabled");
      field.className = disabledClass;
    }
  }
}


/* ---------------------------------------------------------------------------
 * 9. DIAGRAMMID JA "SAMA SUURED KULUD" LAUSE
 * ------------------------------------------------------------------------- */

// Google Charts: lae pakett ja joonista uuesti, kui aken muutub. HTML kutsub seda samas kohas kui varem.
function initCharts() {
  google.load("visualization", "1", {
    packages: ["corechart"],
  });

  /* Set a callback to run when the Google Visualization API is loaded.*/
  google.setOnLoadCallback(drawChart);

  $(window).resize(function () {
    drawChart();
  });
}

function drawPieChart(containerId, rows, colors) {
  var data = new google.visualization.DataTable();
  data.addColumn("string", "Topping");
  data.addColumn("number", "Slices");
  data.addRows(rows);

  var chart = new google.visualization.PieChart(document.getElementById(containerId));
  var options = {
    width: 360,
    height: 240,
    colors: colors,
    backgroundColor: "#f5f7fa",
    is3D: true,
    legend: "right",
    legendTextStyle: {
      color: "#555555",
    },
    chartArea: {
      width: "100%",
      height: "100%",
    },
  };
  chart.draw(data, options);
}

function drawChart() {
  // tavaline palk
  var A = getFieldFloatValue("taxes");
  var B = getFieldFloatValue("localtaxes");
  // diagramm näitab ühe täiskasvanu palka (tulemustabeli netwage võib olla leibkonna summa)
  var C = getFieldFloatValue(byId("netwage_chart") !== null ? "netwage_chart" : "netwage");
  var D = getFieldFloatValue("pension");
  drawPieChart(
    "chart_div",
    [
      ["Riigile laekub maksudena " + round(A, 2), A],
      ["KOV-le laekub maksudena " + round(B, 2), B],
      ["Töötaja saab palgana kätte " + round(C, 2), C],
      ["Kogumispensioni fondi laekub " + round(D, 2), D],
    ],
    ["#63d937", "#cd74e2", "#1aaef8", "#fdbe6f"]
  );

  // kodanikupalgaga
  var A = getFieldFloatValue("taxes_ubi");
  var B = getFieldFloatValue("localtaxes_ubi");
  var C = getFieldFloatValue("workernet");
  var D = getFieldFloatValue("ubiamount");
  var E = getFieldFloatValue("pension_ubi");
  drawPieChart(
    "chart_div_ubi",
    [
      ["Riigile laekub maksudena " + round(A, 2), A],
      ["KOV-le laekub maksudena " + round(B, 2), B],
      ["Üksikisikule tööandjalt ja riigilt " + round(C, 2), C],
      ["... js riigilt veel lisaks " + round(D, 2), D],
      ["Kogumispensioni fondi laekub " + round(E, 2), E],
    ],
    ["#63d937", "#cd74e2", "#1aaef8", "#0000f1", "#fdbe6f"]
  );
}

/* --- "Kui kodanikupalk oleks täiskasvanule X ja lapsele Y, siis kulud oleksid sama suured" lause --- */

/**
 * Elementide ID-d ühes objektis.
 * NB: tahtlikult `var` + uus nimi, mitte tippkihi `const UBI_AMOUNT_ID` jms: kui leht laeb vana
 * HTML-i (kus samad `const`-id on veel inline-skriptis) uue JS-iga, annaks topeltdeklaratsioon
 * SyntaxError'i ja kogu inline-plokk jääks tööle panemata.
 */
var ADULT_AMOUNT_IDS = {
  ubi: "ubi-amount",
  childMinimum: "ubi_model_base_data___alt_child_std_ro",
  childOfficial: "ubi_model_base_data___child_per_month_ro",
  childrenCount: "ubi_model_base_data___others_inc_children_ro",
  pensionersCount: "ubi_model_base_data___pension_receivers_ro",
  taxpayersCount: "ubi_model_base_data___income_tax_payers_ro",
};

/**
 * Abifunktsioon HTML-elemendi väärtuse lugemiseks ja numbriks teisendamiseks
 * Väärtus loetakse kas 'value' (input/textarea) või 'textContent' (span/div) atribuudist
 */
function getNumericValue(elementId) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`Element ID-ga ${elementId} puudub.`);
    return 0;
  }
  // Eeldab, et väärtus on kas inputi sees või tekstisisuna.
  const rawValue = el.value !== undefined ? el.value : el.textContent;
  // Asendab koma punktiga ja parsimine numbriks.
  const num = parseFloat(String(rawValue).replace(",", ".").replace(/[^\d.]/g, "")) || 0;
  return num;
}

/**
 * Arvutab uue täiskasvanu määra ja uuendab teksti lehel.
 *
 * Lause struktuur lehel:
 *   Kui kodanikupalk oleks (olnud) <span id="sametax">täiskasvanule <span id="altAdult"></span> € ja lapsele <span id="altChild"></span> €</span>
 *   <span id="or">või</span> <span id="sametaxB">lapsele <span id="altChildB"></span> € ja täiskasvanule <span id="altAdultB"></span> €,
 *   siis oleksid kulud ja maksuvajadused (olnud) sama suured nagu kõigile võrdse <span id="equalUbi"></span> € korral
 */
function updateAdultAmount() {
  // Eraldi lapse summa korral see lause ei kehti (põhisumma on siis ainult täiskasvanu summa)
  updateAltSentenceVisibility();

  // Iga tsükli alguses loetakse kõik väärtused dünaamiliselt
  const U = getNumericValue(ADULT_AMOUNT_IDS.ubi); // Võrdne UBI
  const C = getNumericValue(ADULT_AMOUNT_IDS.childMinimum); // Lapse miinimum
  const COF = getNumericValue(ADULT_AMOUNT_IDS.childOfficial); // Ametlik lapsestandard
  const NC = getNumericValue(ADULT_AMOUNT_IDS.childrenCount); // Laste arv
  const NA_pensioners = getNumericValue(ADULT_AMOUNT_IDS.pensionersCount); // Pensionäride arv
  const NA_taxpayers = getNumericValue(ADULT_AMOUNT_IDS.taxpayersCount); // Tulumaksumaksjate arv

  // Täiskasvanute koguarv
  const NA = NA_pensioners + NA_taxpayers;

  if (U <= 0 || NA <= 0) {
    // Ei saa arvutada, kui UBI või täiskasvanute arv on 0
    return;
  }

  // 1. Arvuta täiskasvanu määr (A)
  // A = U + (U - C) * (NC / NA)
  const A = U + (U - C) * (NC / NA);
  const B = U + (U - COF) * (NC / NA);

  // 2. Vorminda tulemus
  const adultAmountFormatted = A.toFixed(2).replace(".", ",");
  const adultAmountFormattedB = B.toFixed(2).replace(".", ",");

  // 3. Uuenda lauset
  setHidden(document.getElementById("sametax"), C == U);
  setHidden(document.getElementById("or"), C == U || COF == U);
  setHidden(document.getElementById("sametaxB"), COF == U);

  document.getElementById("altAdult").innerHTML = adultAmountFormatted;
  document.getElementById("altChild").innerHTML = C;
  document.getElementById("altAdultB").innerHTML = adultAmountFormattedB;
  document.getElementById("altChildB").innerHTML = COF;
  document.getElementById("equalUbi").innerHTML = U;
}

/**
 * Käivitab funktsiooni sisendvälja muutmisel ja lehe laadimisel.
 */
function initializeCalculator() {
  const ubiInput = document.getElementById(ADULT_AMOUNT_IDS.ubi);

  if (ubiInput) {
    // Kuula 'input' sündmust ubi-amount väljal
    ubiInput.addEventListener("input", updateAdultAmount);
  }

  // Käivita kord lehe laadimisel (vajalik juhul, kui ubi-amount on juba seadistatud)
  updateAdultAmount();
}


/* ---------------------------------------------------------------------------
 * 10. LEIBKONNA KUISE SISSETULEKU DIAGRAMM
 *     (moodul "KalkulaatorV3M (4)" failis kalkulaator-uus.phtml; eeskujuks horisontaalsed virnatulbad)
 *
 *   Tulbad (kõik summad € kuus kogu leibkonna kohta), järjekorras ülevalt alla:
 *     1. Tööandja kulud  = brutopalk + sotsiaalmaks (+ tööandja töötuskindlustus, kui valitud)
 *     2. Brutopalk       = tööandjalt kättesaadav neto + mahaarvamised
 *                          (variant 1: ühtekuuluvusmaks + tulumaks; variant 2: ühtlane tulumaks)
 *     3. Neto: KdP <summa> €  = tööandjalt kättesaadav neto + vanemate ja laste kodanikupalk
 *                               + suurperetoetus, kui lapsetoetuste kärbe (child_value_eur_<nr> real, mille
 *                               opt_name_ro_<nr> = 1) pole märgitud.
 *                               Silt: "Neto: KdP 600 €"; kui lapse summa erineb täiskasvanu omast, teisel real
 *                               "(laps 300 €)" (vt netUbiLabel).
 *     4. Neto: <aasta>        = tööandjalt kättesaadav neto + senise korra järgi lastele makstav raha
 *                               (lapsetoetus ja lasterikka pere toetus, vt CHILD_BENEFITS)
 *   "Netotulu" sisendirežiimis (input_3) on brutopalk senise korra ja kodanikupalga korral erinev;
 *   siis on tööandja kulude ja brutopalga tulbad mõlema variandi kohta eraldi (senine / KdP).
 *
 *   Seos arvutusega: wageCalc() kutsub buildFamilyChartModel(c) enne applyHousehold()-i (tulemustabeli
 *   spanid on siis veel ühe täiskasvanu väärtused) ja renderFamilyChart(model) pärast seda.
 *   Diagramm EI kirjuta ühtegi arvutuse välja ega muuda tulemustabelit; ta ainult loeb neid.
 *   Kui lehel pole elementi #family-chart (moodulit pole lisatud), tagastab mudel null ja midagi ei juhtu.
 *
 *   Elemendid moodulis: #family-chart-legend, #family-chart-desc, #family-chart (SVG joonistatakse siia).
 *   Kõik abifunktsioonid on kinnises plokis; globaalseks tehakse ainult kaks nime.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  // Lõigud: võti -> silt ja värv. Värvid emp/coh/tax/par/l36/l7/kid on samad mis eeskujul;
  // dark = number lõigu sees valge (tume taust), muidu tume.
  var SEGMENTS = {
    gross: { label: "Brutopalk", color: "#4F6D88", dark: true },
    social: { label: "Sotsiaalmaks", color: "#A64B4B", dark: true },
    uiEr: { label: "Töötuskindlustus (tööandja)", color: "#9BBB59", dark: false },
    emp: { label: "Tööandjalt kättesaadav", color: "#8CA3B8", dark: false },
    uiEe: { label: "Töötuskindlustus (töötaja)", color: "#C3D69B", dark: false },
    pens: { label: "Kogumispension (II sammas)", color: "#F79646", dark: false },
    coh: { label: "Ühtekuuluvusmaks", color: "url(#fc-hatch)", dark: false },
    tax: { label: "Tulumaks", color: "#FFC000", dark: false },
    flat: { label: "Ühtlane tulumaks", color: "#FFC000", dark: false },
    par: { label: "Täiskasvanute kodanikupalk", color: "#31869B", dark: true },
    l36: { label: "Lasterikka pere toetus (3–6 last)", color: "#8064A2", dark: true },
    l7: { label: "Lasterikka pere toetus (7+ last)", color: "#5B4580", dark: true },
    kid: { label: "Laps", color: "#A9D7E2", dark: false },
  };
  // Legendi ja lõikude järjekord
  var SEGMENT_ORDER = ["gross", "social", "uiEr", "emp", "uiEe", "pens", "coh", "tax", "flat", "par", "l36", "l7", "kid"];
  var HATCH_CSS = "repeating-linear-gradient(45deg,#FFC000 0 3px,#8CA3B8 3px 6px)";

  // Joonise mõõdud (viewBox-i ühikutes). Lai paigutus (>= 500 px) ja kitsas paigutus (telefon, külgveerg):
  // kitsas jagab tulba sildi kaheks reaks ja kasutab väiksemat viewBox-i, et kiri jääks loetavaks.
  var LAYOUTS = {
    wide: { name: "wide", labelWidth: 150, barWidth: 290, rightMargin: 60, barHeight: 24, barGap: 5, top: 10, fLabel: 13, fSeg: 12, fTotal: 15, fAxis: 12, wrap: 0, minSeg: 30 },
    compact: { name: "compact", labelWidth: 104, barWidth: 200, rightMargin: 54, barHeight: 32, barGap: 6, top: 10, fLabel: 11, fSeg: 10.5, fTotal: 13, fAxis: 10.5, wrap: 17, minSeg: 26 },
  };
  var WIDE_MIN_PX = 500;

  var lastSignature = "";
  var lastModel = null;
  var watching = false;

  /* ----- väikesed abifunktsioonid ----- */
  function el(id) {
    return document.getElementById(id);
  }

  function toNum(v) {
    v = parseFloat(v);
    return isFinite(v) ? v : 0; // tühi / "NaN" -> 0
  }

  function fieldNum(id) {
    var e = el(id);
    return e === null ? 0 : toNum(e.value);
  }

  function spanNum(id) {
    var e = el(id);
    return e === null ? 0 : toNum(e.innerHTML);
  }

  function cents(v) {
    return Math.round(v * 100) / 100;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Täisarv tuhandete eraldajaga: 2 092
  function fmt(v) {
    return Math.round(v).toLocaleString("et-EE").replace(/[  ]/g, " ");
  }

  // Summa eesti kirjaviisis, ilma lõpu ,00-ta: 592,71 / 493
  function plainAmount(v) {
    return cents(v).toFixed(2).replace(/\.00$/, "").replace(".", ",");
  }

  // Eraldamatu tühik enne €-märki, et summa ei jääks ridade vahel pooleks
  function eurText(v) {
    return plainAmount(v) + "\u00a0€";
  }

  // Protsent sõnena (päisest): "28,32%"
  function percentText(v) {
    v = parseFloat(v);
    return isFinite(v) ? v.toFixed(2).replace(".", ",") + "%" : "–";
  }

  function taxScenario() {
    var radios = getTaxScenarios();
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked === true) return Number(radios[i].value);
    }
    return 1;
  }

  // Iga lapse lapsetoetus kuus (1. ja 2. laps child12, edasi child3plus); tühi, kui aastat tabelis pole
  function childAllowanceList(y, children) {
    var b = CHILD_BENEFITS[Number(y)];
    var list = [];
    if (!b) return list;
    for (var i = 0; i < children; i++) list.push(i < 2 ? b.child12 : b.child3plus);
    return list;
  }

  /* ----- MUDEL: loeb kalkulaatori vahetulemused ja koostab tulbad ----- */

  // Senise korra väärtused ühe täiskasvanu kohta (peidetud sisendid; leibkond neid üle ei kirjuta)
  function readStdPerAdult() {
    return {
      gross: fieldNum("grosswage"),
      social: fieldNum("socialtax"),
      uiEr: fieldNum("ui_employer"),
      uiEe: fieldNum("ui_employee"),
      pens: fieldNum("fpp_1"),
      tax: fieldNum("incometax"),
    };
  }

  // Kodanikupalga variandi väärtused ühe täiskasvanu kohta (spanid; leibkond pole veel peale kirjutatud)
  function readUbiPerAdult() {
    return {
      gross: spanNum("grosswage_ubi"),
      social: spanNum("socialtax_ubi"),
      uiEr: spanNum("ui_employer_ubi"),
      uiEe: spanNum("ui_employee_ubi"),
      pens: spanNum("fpp_1_ubi"),
      tax: spanNum("incometax_ubi"),
      coh: spanNum("ubicontrib"),
      flat: spanNum("flatincometax"),
    };
  }

  function addSeg(list, key, value) {
    var v = cents(value);
    if (v > 0) list.push({ k: key, v: v });
  }

  function makeBar(label, segs) {
    var total = 0;
    segs.forEach(function (s) {
      total += s.v;
    });
    return { label: label, segs: segs, total: cents(total) };
  }

  // Tööandja kulud: brutopalk + sotsiaalmaks + tööandja töötuskindlustus (viimane ainult kui valitud, muidu 0)
  function costBar(label, p, K) {
    var segs = [];
    addSeg(segs, "gross", K * p.gross);
    addSeg(segs, "social", K * p.social);
    addSeg(segs, "uiEr", K * p.uiEr);
    return makeBar(label, segs);
  }

  // Maksud, mis brutopalgast maha lähevad (ühe täiskasvanu kohta)
  function wageDeductions(p, scenario, withCohesion) {
    var d = p.uiEe + p.pens;
    if (!withCohesion) return d + p.tax;
    return d + (scenario === 2 ? p.flat : p.coh + p.tax);
  }

  // Brutopalga tulp: tööandjalt kättesaadav neto + mahaarvamised.
  // withCohesion = kodanikupalga variandi maksud (variant 2: ühtlane tulumaks; variant 1: ühtekuuluvusmaks + tulumaks)
  function grossBar(label, p, K, scenario, withCohesion) {
    var segs = [];
    addSeg(segs, "emp", Math.max(0, K * (p.gross - wageDeductions(p, scenario, withCohesion))));
    addSeg(segs, "uiEe", K * p.uiEe);
    addSeg(segs, "pens", K * p.pens);
    if (withCohesion && scenario === 2) {
      addSeg(segs, "flat", K * p.flat);
    } else {
      if (withCohesion) addSeg(segs, "coh", K * p.coh);
      addSeg(segs, "tax", K * p.tax);
    }
    return makeBar(label, segs);
  }

  /*
    Kodanikupalga neto tulba silt.
    Kõigile ühesugune summa või ainult täiskasvanud sihtrühmas: "Neto: KdP 600 €".
    Lapse summa erineb täiskasvanu (tegelikust) summast: "Neto: KdP 600 €" ja teisel real "(laps 300 €)".
    Ainult lapsed sihtrühmas: "Neto: KdP 0 €" ja "(laps 300 €)" (sama, mis täiskasvanule 0 ja lapsele 300).
  */
  function netUbiLabel(hh, ubiMonthly) {
    var label = "Neto: KdP " + eurText(ubiMonthly);
    var childDiffers = hh.children > 0 && hh.childUbiOn && cents(hh.childUbiEach) !== cents(ubiMonthly);
    return childDiffers ? label + "\n(laps " + eurText(hh.childUbiEach) + ")" : label;
  }

  // Leibkonna kirjeldus diagrammi vasakul
  function describeHouseholdChart(c, hh, scenario) {
    var K = hh.adults;
    var what = c.in1 ? "tööandja kulu" : c.in3 ? "netotulu" : "brutopalk";
    var amount = toNum(c.sum);
    var parents = K === 2 ? "täiskasvanute " + what + ": 2\u00a0×\u00a0" + eurText(amount) : "täiskasvanu " + what + ": " + eurText(amount);
    var desc = {
      household: "Lapsi: " + hh.children + ", täiskasvanuid: " + K + ", " + parents,
      model: "Mudel: kodanikupalk " + eurText(c.ubiPerMonth),
      tax:
        scenario === 2
          ? "ühtlane tulumaks " + percentText(c.newFlatTax) + " kogu brutotulult"
          : "ühtekuuluvusmaks " + percentText(c.addedTax) + " kogu brutotulult, tulumaks endisel kujul",
      note: "",
    };
    if (!isAdultGroupTargeted()) {
      desc.model = isChildGroupTargeted()
        ? "Mudel: kodanikupalk ainult lastele, " + eurText(getChildUbiMonthly(c.ubiPerMonth))
        : "Mudel: kodanikupalka ei maksta, sihtrühmi pole märgitud";
    } else if (hh.children > 0 && hh.childUbiOn && isChildUbiSeparate()) {
      desc.model += ", lapse kodanikupalk " + eurText(hh.childUbiEach);
    }
    if (hh.keepsOldBenefits) {
      desc.note = "Lapsed ei kuulu kodanikupalga sihtrühma, seega jätkub neile senine perehüvitiste süsteem (lapsetoetus ja suurperetoetus).";
    } else if (hh.largeKept > 0) {
      desc.note += (desc.note ? " " : "") + "Lasterikka pere toetus säilib kodanikupalgaga (lapsetoetuste kärbe pole märgitud).";
    }
    return desc;
  }

  /*
    Koostab diagrammi mudeli. Tagastab null, kui diagrammimoodulit lehel pole.
    c = wageCalc() kontekst (c.sum, c.year, c.hh jm), kutsutakse enne applyHousehold()-i.
  */
  function buildFamilyChartModel(c) {
    if (el("family-chart") === null || !c || !c.hh) return null;
    var hh = c.hh;
    var K = hh.adults;
    var scenario = taxScenario();
    var std = readStdPerAdult();
    var ubi = readUbiPerAdult();
    var ubiMonthly = toNum(c.ubiAdult); // täiskasvanu tegelik kodanikupalk (0, kui täiskasvanud pole sihtrühmas)

    // Tööandjalt kättesaadav neto ühe täiskasvanu kohta: senine kord; kodanikupalgaga.
    // Netotulu režiimis (input_3) on sisestatud summa neto koos kodanikupalgaga (nagu tulemustabelis).
    var empStd = Math.max(0, std.gross - std.uiEe - std.pens - std.tax);
    var empUbi = c.in3
      ? Math.max(0, toNum(c.sum) - ubiMonthly)
      : Math.max(0, ubi.gross - wageDeductions(ubi, scenario, true));

    // Netotulu režiimis on brutopalk kahes süsteemis erinev: siis tööandja kulude ja brutopalga tulbad eraldi
    var differ = Math.abs(std.gross - ubi.gross) > 0.005;

    var bars = [];
    if (differ) {
      bars.push(costBar("Tööandja kulud: senine", std, K));
      bars.push(costBar("Tööandja kulud: KdP", ubi, K));
      bars.push(grossBar("Brutopalk: senine", std, K, scenario, false));
      bars.push(grossBar("Brutopalk: KdP", ubi, K, scenario, true));
    } else {
      bars.push(costBar("Tööandja kulud", ubi, K));
      bars.push(grossBar("Brutopalk", ubi, K, scenario, true));
    }

    // Neto kodanikupalgaga: tööandjalt + vanemate kodanikupalk + (säilinud) lasterikka pere toetus + iga lapse kodanikupalk
    var netUbi = [];
    addSeg(netUbi, "emp", K * empUbi);
    addSeg(netUbi, "par", K * ubiMonthly);
    if (hh.largeKept > 0) addSeg(netUbi, hh.children >= 7 ? "l7" : "l36", hh.largeKept);
    if (hh.childUbiOn) {
      for (var i = 0; i < hh.children; i++) addSeg(netUbi, "kid", hh.childUbiEach);
    } else if (hh.keepsOldBenefits) {
      // lapsed pole sihtrühmas: iga lapse senine lapsetoetus säilib (nagu senise korra tulbas)
      childAllowanceList(c.year, hh.children).forEach(function (v) {
        addSeg(netUbi, "kid", v);
      });
    }
    bars.push(makeBar(netUbiLabel(hh, ubiMonthly), netUbi));

    // Neto senise korra järgi: tööandjalt + lasterikka pere toetus + iga lapse lapsetoetus
    var netStd = [];
    addSeg(netStd, "emp", K * empStd);
    if (hh.largeFamily > 0) addSeg(netStd, hh.children >= 7 ? "l7" : "l36", hh.largeFamily);
    childAllowanceList(c.year, hh.children).forEach(function (v) {
      addSeg(netStd, "kid", v);
    });
    bars.push(makeBar("Neto: " + c.year, netStd));

    var has = function (segs) {
      return segs.some(function (s) {
        return s.k === "kid";
      });
    };
    var kidWhat = has(netUbi) && has(netStd) && hh.childUbiOn ? "kodanikupalk / lapsetoetus " + c.year : has(netStd) ? "lapsetoetus " + c.year : "kodanikupalk";
    return {
      bars: bars,
      parentsLabel: K === 1 ? "Täiskasvanu kodanikupalk" : "Täiskasvanute kodanikupalk",
      kidLabel: "Laps (" + kidWhat + ")",
      desc: describeHouseholdChart(c, hh, scenario),
    };
  }

  /* ----- JOONISTAMINE ----- */
  function segmentLabel(model, key) {
    if (key === "par") return model.parentsLabel;
    if (key === "kid") return model.kidLabel;
    return SEGMENTS[key].label;
  }

  // Lõigud, mis diagrammil tegelikult olemas on (legendi jaoks)
  function presentKeys(model) {
    var seen = {};
    model.bars.forEach(function (b) {
      b.segs.forEach(function (s) {
        seen[s.k] = true;
      });
    });
    return SEGMENT_ORDER.filter(function (k) {
      return seen[k] === true;
    });
  }

  // Telje samm: 1, 2, 2,5 või 5 * 10^n, nii et ruudustikus oleks umbes 5-6 joont
  function niceStep(max) {
    if (!(max > 0)) return 200;
    var raw = max / 6;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var options = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < options.length; i++) {
      if (options[i] * mag >= raw) return options[i] * mag;
    }
    return 10 * mag;
  }

  function svgText(x, y, s, o) {
    o = o || {};
    return (
      '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 13) + '" text-anchor="' + (o.anchor || "start") + '"' +
      (o.bold ? ' font-weight="700"' : "") +
      ' fill="' + (o.fill || "#262626") + '">' + esc(s) + "</text>"
    );
  }

  // Tulba silt ridadeks (kuni 2); " €" seotakse eelneva numbriga, et summat ei lõhutaks.
  // Selgesõnaline reavahetus "\n" (nt "Neto: KdP 600 €\n(laps 300 €)") jagab sildi alati kaheks reaks.
  function labelLines(label, maxChars) {
    label = label.replace(/ €/g, "\u00a0€");
    if (label.indexOf("\n") !== -1) return label.split("\n").slice(0, 2);
    if (!maxChars || label.length <= maxChars) return [label];
    var words = label.split(" ");
    var first = words[0];
    var i = 1;
    while (i < words.length && (first + " " + words[i]).length <= maxChars) first += " " + words[i++];
    return i < words.length ? [first, words.slice(i).join(" ")] : [first];
  }

  function svgLabel(x, cy, lines, L) {
    var lh = L.fLabel * 1.15;
    var first = cy - ((lines.length - 1) * lh) / 2 + L.fLabel * 0.35;
    return lines
      .map(function (line, i) {
        return svgText(x, (first + i * lh).toFixed(1), line, { anchor: "end", size: L.fLabel });
      })
      .join("");
  }

  function buildSvg(model, L) {
    var x0 = L.labelWidth;
    var max = 0;
    model.bars.forEach(function (b) {
      if (b.total > max) max = b.total;
    });
    var step = niceStep(max);
    var axisMax = Math.max(step, Math.ceil(max / step - 1e-9) * step);
    var scale = L.barWidth / axisMax;

    var y = L.top;
    var bodies = "";
    model.bars.forEach(function (b) {
      var x = x0;
      var cy = y + L.barHeight / 2;
      var base = (cy + L.fSeg * 0.35).toFixed(1);
      bodies += svgLabel(x0 - 8, cy, labelLines(b.label, L.wrap), L);
      b.segs.forEach(function (s) {
        var w = s.v * scale;
        var def = SEGMENTS[s.k];
        bodies +=
          '<rect x="' + x.toFixed(2) + '" y="' + y + '" width="' + w.toFixed(2) + '" height="' + L.barHeight +
          '" fill="' + def.color + '" stroke="#fff" stroke-width="1.5"><title>' +
          esc(segmentLabel(model, s.k) + ": " + fmt(s.v) + " €") + "</title></rect>";
        if (w > L.minSeg) {
          bodies += svgText(x + w / 2, base, fmt(s.v), { anchor: "middle", size: L.fSeg, fill: def.dark ? "#fff" : "#1f1f1f" });
        }
        x += w;
      });
      bodies += svgText(x + 6, (cy + L.fTotal * 0.35).toFixed(1), fmt(b.total), { size: L.fTotal, bold: true });
      y += L.barHeight + L.barGap;
    });

    var grid = "";
    for (var v = 0; v <= axisMax + 1e-9; v += step) {
      var gx = (x0 + v * scale).toFixed(2);
      grid += '<line x1="' + gx + '" x2="' + gx + '" y1="' + (L.top - 6) + '" y2="' + y + '" stroke="#d9d9d9"/>';
      grid += svgText(gx, y + L.fAxis + 4, fmt(v), { anchor: "middle", size: L.fAxis, fill: "#595959" });
    }
    grid += svgText(x0 + L.barWidth / 2, y + 2 * L.fAxis + 10, "€ kuus, kogu leibkond", { anchor: "middle", size: L.fAxis, fill: "#595959" });

    var width = x0 + L.barWidth + L.rightMargin;
    var height = y + 2 * L.fAxis + 20;
    var defs =
      '<defs><pattern id="fc-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="7" height="7" fill="#8CA3B8"/><rect width="3.5" height="7" fill="#FFC000"/></pattern></defs>';
    var summary = model.bars
      .map(function (b) {
        return b.label.replace("\n", " ") + " " + fmt(b.total);
      })
      .join(", ");
    return (
      '<svg class="fc-svg" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' +
      esc("Leibkonna kuine sissetulek, € kuus: " + summary) + '">' + defs + grid + bodies + "</svg>"
    );
  }

  function renderLegend(model) {
    var box = el("family-chart-legend");
    if (box === null) return;
    box.innerHTML = presentKeys(model)
      .map(function (k) {
        var swatch = k === "coh" ? HATCH_CSS : SEGMENTS[k].color;
        return '<span><i style="background:' + swatch + '"></i>' + esc(segmentLabel(model, k)) + "</span>";
      })
      .join("");
  }

  function renderDescription(model) {
    var box = el("family-chart-desc");
    if (box === null) return;
    var d = model.desc;
    box.innerHTML =
      '<h3 class="fc-desc-title">Leibkond - ' +
      esc(d.household) + "</h3>" +
      '<h3 class="fc-desc-title">' + esc(d.model) + ", " +
      esc(d.tax) + "</h3>" +
      (d.note ? '<p class="fc-note">' + esc(d.note) + "</p>" : "");
  }

  // Paigutus sõltub diagrammi kasti laiusest; peidetud kasti (laius 0, nt mobiilivaheleht) puhul lai
  function layoutFor(box) {
    var w = box.clientWidth;
    return w > 0 && w < WIDE_MIN_PX ? LAYOUTS.compact : LAYOUTS.wide;
  }

  // Joonistab uuesti, kui kasti laius (ja sellega paigutus) muutub: akna suuruse muutus või vaheleht avatakse
  function watchResize(box) {
    if (watching) return;
    watching = true;
    var redraw = function () {
      if (lastModel !== null) renderFamilyChart(lastModel);
    };
    if (typeof ResizeObserver === "function") new ResizeObserver(redraw).observe(box);
    else window.addEventListener("resize", redraw);
  }

  /*
    Joonistab mudeli. Arvutus käivitub HTML-i käsitlejatest sageli kaks korda toimingu kohta;
    kui mudel ja paigutus pole viimasest joonistamisest muutunud, ei tehta midagi.
  */
  function renderFamilyChart(model) {
    var box = el("family-chart");
    if (box === null || model === null) return;
    lastModel = model;
    var layout = layoutFor(box);
    var signature = layout.name + JSON.stringify(model);
    watchResize(box);
    if (signature === lastSignature && box.firstChild !== null) return;
    lastSignature = signature;
    renderLegend(model);
    renderDescription(model);
    box.innerHTML = buildSvg(model, layout);
  }

  window.buildFamilyChartModel = buildFamilyChartModel;
  window.renderFamilyChart = renderFamilyChart;
})();


/* ---------------------------------------------------------------------------
 * 11. TULEMUSE LAUSE ("see leibkond saab kodanikupalgaga X € võrra rohkem")
 *     (element #result-sentence diagrammimoodulis "KalkulaatorV3M (diagramm)"; kutsutakse wageCalc()-ist)
 *
 *   Lause võtab numbrid tulemustabelist PÄRAST leibkonna ülekirjutust (applyHousehold), st samad
 *   leibkonna kuusummad, mida kasutaja tabelis näeb:
 *     - brutopalga ja tööandja kulu režiimis: rea "Netotulu kokku" kodanikupalgaga ja senise korra
 *       järgi väärtuste vahe;
 *     - netotulu režiimis (input_3) on täiskasvanute neto mõlemas süsteemis sama (sisestatud summa),
 *       seega ei oleks neto vahe sisuline. Siis võrreldakse tööandja kulu (palgafondi) ja laste raha.
 *   Lause EI kirjuta ühtegi arvutuse välja; ta ainult loeb neid. Kui lehel pole elementi
 *   #result-sentence (moodulit pole lisatud), ei juhtu midagi. Kui arvutuse tulemus pole arv
 *   (tühi sisend, "NaN"), lause peidetakse.
 *   Sõnastus on TEXT-objektis allpool: muuda seal. Globaalseks tehakse ainult üks nimi.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  // {household} = leibkonna kirjeldus sulgudes, {amount} = summa (läheb paksu kirja).
  var TEXT = {
    adults: ["1 täiskasvanu", "2 täiskasvanut"],
    child: "1 laps",
    children: "{n} last",
    // sisendi nimetus leibkonna kirjelduses (c.in1 / c.in2 / c.in3)
    wageWord: { 1: "tööandja kulu", 2: "brutopalk", 3: "netotulu" },

    // brutopalga ja tööandja kulu režiim: võrreldakse leibkonna netotulu
    more: "See leibkond ({household}) saab kodanikupalgaga kuus {amount} võrra rohkem kui senise korra järgi.",
    less: "See leibkond ({household}) saab kodanikupalgaga kuus {amount} võrra vähem kui senise korra järgi.",
    same: "See leibkond ({household}) saab kodanikupalgaga kuus sama palju kui senise korra järgi.",

    // netotulu režiim: täiskasvanute neto on sama, võrreldakse tööandja kulu
    costLess: "Selle leibkonna ({household}) netotulu tagamiseks kulutab tööandja kodanikupalgaga kuus {amount} võrra vähem kui senise korra järgi.",
    costMore: "Selle leibkonna ({household}) netotulu tagamiseks kulutab tööandja kodanikupalgaga kuus {amount} võrra rohkem kui senise korra järgi.",
    costSame: "Selle leibkonna ({household}) netotulu tagamiseks kulutab tööandja kodanikupalgaga sama palju kui senise korra järgi.",
    // netotulu režiim, lapsed: lisalause
    kidsMore: " Laste raha on kodanikupalgaga {amount} võrra suurem kui senise korra järgi.",
    kidsLess: " Laste raha on kodanikupalgaga {amount} võrra väiksem kui senise korra järgi.",
  };
  var TONES = ["is-more", "is-less", "is-same", "is-info"];

  var lastKey = null;

  // Tabeli span -> arv (NaN, kui tühi või mittearvuline)
  function spanValue(id) {
    var e = document.getElementById(id);
    return e === null ? NaN : parseFloat(e.innerHTML);
  }

  function cents(v) {
    return Math.round(v * 100) / 100;
  }

  // Summa eesti kirjaviisis: tuhandete eraldaja eraldamatu tühik, koma, lõpu ,00 ära; "1 500" / "312,4" -> "312,40"
  function eurText(v) {
    var s = cents(Math.abs(v)).toFixed(2).replace(/\.00$/, "").split(".");
    var whole = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (v < 0 ? "−" : "") + whole + (s.length > 1 ? "," + s[1] : "") + " €";
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Leibkonna kirjeldus: "2 täiskasvanut, 3 last, brutopalk 2 × 1 500 €"; null, kui sisestatud summa pole arv
  function householdText(c, hh) {
    var sum = parseFloat(c.sum);
    if (!isFinite(sum)) return null;
    var parts = [TEXT.adults[hh.adults === 2 ? 1 : 0]];
    if (hh.children > 0) parts.push(hh.children === 1 ? TEXT.child : TEXT.children.replace("{n}", hh.children));
    var word = TEXT.wageWord[c.in1 ? 1 : c.in3 ? 3 : 2];
    parts.push(word + " " + (hh.adults === 2 ? "2 × " : "") + eurText(sum));
    return parts.join(", ");
  }

  // Täidab malli: {household} ja {amount}; summa läheb paksu kirja
  function fill(template, household, amount) {
    return template
      .replace("{household}", function () {
        return esc(household);
      })
      .replace("{amount}", function () {
        return "<strong>" + esc(eurText(amount)) + "</strong>";
      });
  }

  // Brutopalga ja tööandja kulu režiim: leibkonna netotulu kodanikupalgaga miinus senise korra järgi
  function netSentence(household) {
    var diff = cents(spanValue("totalnet") - spanValue("netwage_std"));
    if (!isFinite(diff)) return null;
    if (diff === 0) return { tone: "is-same", html: fill(TEXT.same, household, 0) };
    return diff > 0
      ? { tone: "is-more", html: fill(TEXT.more, household, diff) }
      : { tone: "is-less", html: fill(TEXT.less, household, -diff) };
  }

  // Netotulu režiim: tööandja kulu (palgafond) ja laste raha. Laste vahe võetakse otse sisenditest,
  // mitte neto spanidest, et sentide ümardusvahe ei annaks "0,01 € vähem".
  function costSentence(household, hh) {
    var cost = cents(spanValue("wagefund_ubi") - spanValue("wagefund_std"));
    if (!isFinite(cost)) return null;
    var html;
    if (cost === 0) html = fill(TEXT.costSame, household, 0);
    else if (cost < 0) html = fill(TEXT.costLess, household, -cost);
    else html = fill(TEXT.costMore, household, cost);
    var kids = cents(hh.ubiExtra - hh.childStd);
    if (kids > 0) html += fill(TEXT.kidsMore, household, kids);
    else if (kids < 0) html += fill(TEXT.kidsLess, household, -kids);
    return { tone: "is-info", html: html };
  }

  function buildSentence(c) {
    var household = householdText(c, c.hh);
    if (household === null) return null;
    return c.in3 ? costSentence(household, c.hh) : netSentence(household);
  }

  /*
    Kirjutab lause elementi #result-sentence. Arvutus käivitub HTML-i käsitlejatest sageli kaks korda
    toimingu kohta; kui lause pole muutunud, ei puututa DOM-i (ekraanilugeja ei loe sama lauset uuesti).
    c = wageCalc() kontekst; kutsutakse pärast applyHousehold()-i.
  */
  function renderResultSentence(c) {
    var box = document.getElementById("result-sentence");
    if (box === null || !c || !c.hh) return;
    var result = buildSentence(c);
    var key = result === null ? "" : result.tone + "|" + result.html;
    if (key === lastKey) return;
    lastKey = key;
    TONES.forEach(function (tone) {
      box.classList.remove(tone);
    });
    if (result === null) {
      box.innerHTML = "";
      setHidden(box, true);
      return;
    }
    box.classList.add(result.tone);
    box.innerHTML = result.html;
    setHidden(box, false);
  }

  window.renderResultSentence = renderResultSentence;
})();


/* ---------------------------------------------------------------------------
 * 12. MAKSUMUDELI VALIK DIAGRAMMI JUURES (variant 1 / variant 2)
 *     (nupud name="taxscenario_chart" diagrammimoodulis "KalkulaatorV3M (diagramm)"; kutsutakse wageCalc()-ist)
 *
 *   Tegelik valik on endiselt mooduli (3) raadionuppudel name="taxscenario": need loevad
 *   applyTaxScenario(), calcGrossWageUbiFromNet() ja diagramm. Diagrammi nupud valivad ainult sama
 *   nupu tabelis ja käivitavad wageCalc() (täpselt nagu tabeli nupud), ning wageCalc() peegeldab
 *   tabeli valiku tagasi diagrammi nuppudesse. Seega on valik alati ühes kohas ja kahes kohas näha.
 *
 *   TÄHELEPANU: diagrammi nupud EI TOHI kasutada nime "taxscenario". Mõlemad getElementsByName("taxscenario")
 *   tsüklid (applyTaxScenario, calcGrossWageUbiFromNet) on kirjutatud nii, et käivitub kõigi mitte-"2 märgitud"
 *   nuppude haru ja "viimane võidab". See toimib ainult praeguse kahe nupu järjekorra tõttu; kolmas ja neljas
 *   samanimeline nupp (diagramm on lehel tabelist ees) annaks variandi 2 korral variandi 1 tulemuse.
 *   Kui lehel pole mooduli (3) nuppe, ei tee diagrammi nupud midagi ja jäävad variandi 1 peale.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  var CHART_BUTTONS = "taxscenario_chart";

  // Märgitud maksustsenaarium mooduli (3) nuppude järgi; null, kui nuppe pole
  function tableScenario() {
    var radios = getTaxScenarios();
    if (radios.length === 0) return null;
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked === true) return Number(radios[i].value);
    }
    return 1;
  }

  // Märgib diagrammi nuppudest selle, mille väärtus on value
  function markChartButtons(value) {
    var buttons = document.getElementsByName(CHART_BUTTONS);
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].checked = Number(buttons[i].value) === value;
    }
  }

  // Diagrammi nupu käsitleja (onchange): vali sama nupp tabelis ja arvuta uuesti
  function setTaxScenario(value) {
    var radios = getTaxScenarios();
    var target = null;
    for (var i = 0; i < radios.length; i++) {
      if (Number(radios[i].value) === Number(value)) target = radios[i];
    }
    if (target === null) {
      markChartButtons(tableScenario() || 1); // mooduli (3) nuppe pole: ära valeta
      return;
    }
    target.checked = true;
    wageCalc();
  }

  // Peegeldab tabeli valiku diagrammi nuppudesse; kutsutakse wageCalc() lõpust
  function syncTaxScenarioButtons() {
    var value = tableScenario();
    if (value !== null) markChartButtons(value);
  }

  window.setTaxScenario = setTaxScenario;
  window.syncTaxScenarioButtons = syncTaxScenarioButtons;
})();


/* ---------------------------------------------------------------------------
 * 13. TÄIENDAVATE KÄRPETE KERIMISVÄLI (100 mln € sammuga)
 *     (element #fc-cut-stepper diagrammimoodulis "KalkulaatorV3M (diagramm)"; kutsutakse wageCalc()-ist)
 *
 *   Kerimisväli ei salvesta midagi ise: see juhib Fabriku välja #all_value_eur_custom (kärpekohtade tabeli juures,
 *   name="reductionValueCustom", step="100000000", min="0"). Noole klõps seab välja uue väärtuse ja käivitab
 *   väljal "change" sündmuse, mis kutsub välja enda HTML-i käsitleja onchange="calcReduction(this);outputCalc();".
 *   Seega on arvutus täpselt sama, mis siis, kui kasutaja kirjutaks summa väljale ise.
 *
 *   Vastupidi: kerimisvälja näit loetakse alati väljalt, igal wageCalc()-i käigul (ka siis, kui kasutaja kirjutas väljale
 *   oma arvu või tegi sellel topeltklõpsu, vt toggleVals). Kui arv pole sammu kordne (nt 150 000 000), näitab
 *   kerimisväli seda tavalise väärtusena ja märkus ütleb, kuhu nooled selle viivad (nagu brauseri enda number-välja nooled:
 *   lähima sammuni üles / alla).
 *
 *   Ilma väljata (nt Fabriku grupp #group162 pole lehel) jääb kerimisväli peidetuks (d-none) ja midagi ei toimu.
 *   Samm ja miinimum loetakse välja atribuutidest step ja min (vaikimisi 100 000 000 ja 0). HTML-i nuppude
 *   aria-label tekstid ("100 miljoni euro võrra") on kirjas käsitsi: kui muudad välja sammu, muuda ka need.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  var FIELD_ID = "all_value_eur_custom";
  var DEFAULT_STEP = 100000000;
  var EPS = 1e-9;
  var lastKey = null;

  function field() {
    return document.getElementById(FIELD_ID);
  }

  function toNumber(value, fallback) {
    var n = parseFloat(value);
    return isFinite(n) ? n : fallback;
  }

  function stepOf(f) {
    var step = toNumber(f.step, DEFAULT_STEP); // step="any" -> vaikesamm
    return step > 0 ? step : DEFAULT_STEP;
  }

  // Tühi või vigane väli = 0 (nagu customReductionValue() arvutuses)
  function valueOf(f) {
    return toNumber(f.value, 0);
  }

  // Väärtus sammu kordsena; ujukomamüra (nt 2.9999999999) loetakse täisarvuks
  function stepsIn(value, step) {
    var q = value / step;
    var r = Math.round(q);
    return Math.abs(q - r) < EPS ? r : q;
  }

  // Lähim sammu kordne üles (direction > 0) või alla (direction < 0), mitte alla miinimumi
  function nextValue(value, direction, step, min) {
    var q = stepsIn(value, step);
    var n = direction > 0 ? Math.floor(q) + 1 : Math.ceil(q) - 1;
    return Math.max(min, n * step);
  }

  // 300000000 -> "300 mln €", 1200000000 -> "1 200 mln €", 150000 -> "0,15 mln €" (tühikud on mittemurduvad)
  function mln(value) {
    var m = Math.round((value / 1e6) * 100) / 100;
    return m.toLocaleString("et-EE", { maximumFractionDigits: 2 }).replace(/[  ]/g, " ") + " mln €";
  }

  function eur(value) {
    return Math.round(value).toLocaleString("et-EE").replace(/[  ]/g, " ") + " €";
  }

  function hide(el, on) {
    if (el !== null) el.classList.toggle("d-none", on);
  }

  function noteText(value, step, min) {
    return (
      "Kärpekohtade lahtrisse on kirjutatud oma summa " + eur(value) + ". Nooled viivad selle " + mln(step) + " sammule: " +
      "▼ " + mln(nextValue(value, -1, step, min)) + ", ▲ " + mln(nextValue(value, 1, step, min)) + "."
    );
  }

  /*
    Uuendab kerimisvälja näidu välja praeguse väärtuse järgi; kutsutakse wageCalc() lõpust ja nooltelt.
    Kui väärtus pole muutunud, ei puututa DOM-i (väljund on ekraanilugejale elav piirkond, ei loe sama väärtust uuesti).
  */
  function syncCutStepper() {
    var box = document.getElementById("fc-cut-stepper");
    if (box === null) return;
    var f = field();
    if (f === null) {
      lastKey = null;
      hide(box, true);
      return;
    }
    var value = valueOf(f);
    var step = stepOf(f);
    var min = toNumber(f.min, 0);
    var key = value + "|" + step + "|" + min;
    hide(box, false);
    if (key === lastKey) return;
    lastKey = key;

    var out = document.getElementById("fc-cuts-value");
    if (out !== null) out.textContent = mln(value);
    var down = box.querySelector('[data-cuts-dir="-1"]');
    if (down !== null) down.setAttribute("aria-disabled", value <= min ? "true" : "false");

    var note = document.getElementById("fc-cuts-note");
    var offGrid = value > min && stepsIn(value, step) !== Math.round(stepsIn(value, step));
    if (note !== null) {
      note.textContent = offGrid || value < min ? noteText(value, step, min) : "";
      hide(note, !(offGrid || value < min));
    }
  }

  // Noolte käsitleja: direction 1 = rohkem lisakärpeid, -1 = vähem
  function stepCuts(direction) {
    var f = field();
    if (f === null) return;
    var current = valueOf(f);
    var next = nextValue(current, direction, stepOf(f), toNumber(f.min, 0));
    if (next === current) return; // nt ▼ nulli juures
    f.value = String(next);
    // Sama sündmus, mille brauser annab, kui kasutaja väärtuse väljal ise muudab; käivitab välja onchange-käsitleja
    f.dispatchEvent(new Event("change", { bubbles: true }));
    syncCutStepper(); // juhuks, kui väljal pole onchange-käsitlejat (wageCalc() ei jooksnud)
  }

  // "?" nupu käsitleja: täpsem selgitus lahti / kinni
  function toggleCutsHelp() {
    var button = document.getElementById("fc-cuts-help-btn");
    var panel = document.getElementById("fc-cuts-help");
    if (button === null || panel === null) return;
    var open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", open ? "true" : "false");
    hide(panel, !open);
  }

  window.stepCuts = stepCuts;
  window.toggleCutsHelp = toggleCutsHelp;
  window.syncCutStepper = syncCutStepper;

  // Esimene näit: wageCalc() kutsub seda küll igal arvutusel, aga väli võib olla algväärtusega juba enne esimest arvutust
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncCutStepper);
  else syncCutStepper();
})();
