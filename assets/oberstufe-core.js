/* =====================================================================
   oberstufe-core.js — gemeinsames Basis-JavaScript der Oberstufen-LernHTML
   ---------------------------------------------------------------------
   Quelle: Lucas/LernHTML_Basis/assets/oberstufe-core.js — NUR DORT ÄNDERN.
   Jede andere Fassung (z. B. Kl11_Kl12/assets/) ist eine Kopie und wird von
   paket_bauen.py kurs ueberschrieben.
   Regeln: DESIGN.md, COMPONENTS.md
   Fremdanteil: Parsons-Puzzle nach openpatch/bitflow (MIT-Lizenz,
   © 2021 Mike Barkmin), ohne React nachgebaut. Gezeichnete Struktogramme
   (.struktogramm-zeichnen) nutzen die StruktoLab-Anzeige in
   assets/struktolab/ (MIT-Lizenz, © 2019 Didaktik der Informatik der
   TU Dresden), erweitert um die Kursnotation; hier nur der Aufruf.

   Hier stehen NUR Seitenmechanik und Aufdeckwerkzeuge:
     Navigation, Ansichtsmodus, additives Aufdecken (revealSub mit
     Sperrhinweisen, subReveal mit Weiter-Box), Auswertungspanels,
     Akkordeon, Code-Kopie, SVG-Export,
     Eingabeaufgaben (checkGroup/clearGroup), Begriffszuordnung (match…),
     Reihenfolge (reihenfolge…), Parsons-Puzzle (parsons…),
     Kreuzworträtsel (kreuzwort…),
     Zugänglichkeit (initZugang).

   NICHT hier, sondern in assets/engine.js (Kopie von _shared/engine.js):
     twoStageQuizCheck, quizReset  (zweistufiges Quiz)
     showSol                       (gestufte Hilfen)
   _shared/engine.js bleibt die einzige Quelle dieser beiden Bausteine.
   assets/engine.js ist eine unveraenderte Kopie; check_structure.py
   vergleicht beide und meldet jede Abweichung.

   Ladereihenfolge in der Lektion:
     <script src="assets/engine.js"></script>
     <script src="assets/oberstufe-core.js"></script>
     <script> …lokales Seiten-JavaScript… </script>

   Keine Persistenz: weder localStorage noch sessionStorage. Ein Reload
   beginnt im Unterrichtsmodus mit zugeklappten Aufdeckungen
   (SPEZIFIKATION.md Abschnitt 4 und 6a).
   ===================================================================== */

/* ==== Scrollen ======================================================
   Ziel ist IMMER das Element selbst, block:'start'. Niemals ein sticky
   Navigationselement in den Viewport scrollen: es gilt fuer
   scrollIntoView() oft bereits als sichtbar, der Aufruf wird dann
   stillschweigend zum No-op (SPEZIFIKATION.md Abschnitt 3).
   ===================================================================== */
function navHoehe() {
  const nav = document.querySelector('.top-nav');
  return nav ? nav.getBoundingClientRect().height : 0;
}

let scrollAuftrag = 0;

/* Einbettung in OPAL: Die Lektion steckt dort in einem iframe mit
   scrolling="no" und overflow:hidden, dessen Hoehe (iFrameResizer) der
   Seitenhoehe folgt. Dann scrollt nicht die Lektion, sondern die Elternseite.
   Ein window.scrollTo im iframe wuerde den Inhalt nur unsichtbar verschieben,
   und weil der iframe keine Scrollleiste hat, kommt man nicht mehr zurueck.
   Rueckgabe: das iframe-Element, wenn die Elternseite scrollen muss, sonst null. */
function elternScrollRahmen() {
  try {
    if (window.parent === window) return null;
    const rahmen = window.frameElement;
    if (!rahmen) return null;
    void window.parent.document; /* Herkunftspruefung */
    const ohneEigenScroll = rahmen.getAttribute('scrolling') === 'no'
      || getComputedStyle(rahmen).overflow === 'hidden'
      || getComputedStyle(rahmen).overflowY === 'hidden'
      || rahmen.getBoundingClientRect().height >= document.documentElement.scrollHeight - 2;
    return ohneEigenScroll ? rahmen : null;
  } catch (e) { return null; }
}

function scrollToWithNavOffset(el) {
  if (!el) return;
  const auftrag = ++scrollAuftrag;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (auftrag !== scrollAuftrag || !el.isConnected) return;
    const wrap = document.querySelector('.wrap') || document.body;
    wrap.style.setProperty('--lesson-scroll-space', '0px');
    void wrap.offsetHeight;
    const rahmen = elternScrollRahmen();
    const zielOben = el.getBoundingClientRect().top + window.pageYOffset;
    const natuerlichesEnde = wrap.getBoundingClientRect().bottom + window.pageYOffset;
    /* Sichtbare Hoehe: im iframe die der Elternseite. window.innerHeight waere
       dort so gross wie die ganze Seite, die Reserve wuerde mit jedem Sprung
       wachsen (Leerraum ohne Inhalt). Zusaetzlich durch die Bildschirmhoehe
       gedeckelt. */
    const bildschirm = (window.screen && (window.screen.availHeight || window.screen.height)) || window.innerHeight;
    let sichtHoehe = Math.min(window.innerHeight, bildschirm);
    if (rahmen) {
      try { sichtHoehe = Math.min(window.parent.innerHeight, bildschirm); } catch (e) { /* bleibt */ }
    }
    if (rahmen) {
      /* Im iframe klebt die Kopfleiste nicht: Ziel mit kleinem Rand oben,
         auf Seiten mit Fortschrittsanzeige zusätzlich unter deren Leiste. */
      const rand = 16 + fsSchwebeReserve();
      const benoetigtesEnde = zielOben - rand + sichtHoehe + 16;
      const zusatz = Math.max(0, Math.ceil(benoetigtesEnde - natuerlichesEnde));
      wrap.style.setProperty('--lesson-scroll-space', zusatz + 'px');
      void wrap.offsetHeight;
      /* Eigene Scrollposition bleibt 0 (falls sie verrutscht ist, zurueck). */
      if (window.pageYOffset) window.scrollTo(0, 0);
      /* Erst scrollen, wenn iFrameResizer den iframe an die neue Seitenhoehe
         angepasst hat; sonst ist die Elternseite noch zu kurz. */
      const start = Date.now();
      const versuch = () => {
        if (auftrag !== scrollAuftrag || !el.isConnected) return;
        const passt = rahmen.getBoundingClientRect().height >= document.documentElement.scrollHeight - 2;
        if (!passt && Date.now() - start < 1200) { setTimeout(versuch, 50); return; }
        try {
          const oben = rahmen.getBoundingClientRect().top + window.parent.pageYOffset;
          const ziel = Math.max(0, oben + el.getBoundingClientRect().top + window.pageYOffset - rand);
          window.parent.scrollTo({ top: ziel, behavior: 'auto' });
        } catch (e) { /* fremde Herkunft */ }
      };
      versuch();
      return;
    }
    const abstand = navHoehe() + 8;
    const benoetigtesEnde = zielOben - abstand + sichtHoehe + 16;
    const zusatz = Math.max(0, Math.ceil(benoetigtesEnde - natuerlichesEnde));
    wrap.style.setProperty('--lesson-scroll-space', zusatz + 'px');
    /* Die neue Unterkante muss berechnet sein, bevor scrollTo sein Maximum
       bestimmt; sonst bleibt ein kurzes Ziel trotz korrekter Reserve mittig. */
    void wrap.offsetHeight;
    window.scrollTo({ top: Math.max(0, zielOben - abstand), behavior: 'auto' });
  }));
}

/* ==== Phasenwechsel =================================================
   Phasen werden ueber die .on-Klasse geschaltet, nicht ueber Inline-
   display. Sonst wuerde ein Aufdeckzustand beim Phasenwechsel verloren
   gehen.
   ===================================================================== */
function showPhase(n) {
  document.querySelectorAll('.phase').forEach(s => s.classList.toggle('on', s.id === 'ph' + n));
  document.querySelectorAll('.pnav, .tn-pill').forEach(b => b.classList.toggle('active', b.id === 'pn' + n));
  const target = document.getElementById('ph' + n);
  if (target) scrollToWithNavOffset(target);
  fortschrittZeichnen();                         /* ohne FORTSCHRITT der Seite wirkungslos */
}

/* ==== Ansichtsmodus =================================================
   Zwei immer sichtbare Knoepfe, kein Vorab-Popup, keine Persistenz.
   Startzustand ist der Unterrichtsmodus.
   ===================================================================== */
function setViewMode(full) {
  document.body.classList.toggle('mode-full', !!full);
  /* Kopfleiste der Referenzdateien: #mode-unterricht / #mode-voll mit .active */
  [['mode-unterricht', !full], ['mode-voll', !!full]].forEach(([id, an]) => {
    const b = document.getElementById(id);
    if (b) { b.classList.toggle('active', an); b.setAttribute('aria-pressed', String(an)); }
  });
  /* Nur bei einem echten Moduswechsel zur offenen Phase zurueck, und dann in
     beide Richtungen: beim Einschalten der Vollansicht wachsen die Phasen
     darueber, sonst steht die Ueberschrift danach hinter der klebenden
     Navigation. Beim ersten Aufruf waehrend des Seitenaufbaus wird NICHT
     gescrollt — sonst springt die Seite ueber ihren eigenen Kopf hinweg. */
  if (setViewMode.zuvor !== undefined && setViewMode.zuvor !== !!full) {
    const offen = document.querySelector('.phase.on');
    if (offen) setTimeout(() => scrollToWithNavOffset(offen), 0);
  }
  setViewMode.zuvor = !!full;
  fortschrittSchweben();
}

/* ==== Additives Aufdecken ===========================================
   subReveal deckt einen oder mehrere Teilschritte auf und blendet die
   zugehoerige Weiter-Box aus. subUnlock gibt den gateten Knopf frei und
   wird von der jeweiligen Prueffunktion im Erfolgsfall aufgerufen.

   Jedes Gate braucht daneben einen ungated Fallback-Knopf, der dieselbe
   subReveal-Zeile aufruft (AUFDECKMUSTER_STATIONEN.md R4). Ein Gate haengt
   nur an einer objektiv pruefbaren Aufgabe, nie an Freitextlaenge oder
   Klickzahl (R1/R2).
   ===================================================================== */
function subReveal(targetId, btn) {
  const ids = Array.isArray(targetId) ? targetId : [targetId];
  let erstes = null;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('on');
    if (!erstes) erstes = el;
  });
  if (btn) {
    const box = btn.closest('.weiter-box');
    if (box) box.style.display = 'none';
  }
  if (erstes) setTimeout(() => scrollToWithNavOffset(erstes), 50);
}

function subUnlock(btnId) {
  const b = document.getElementById(btnId);
  if (b) b.disabled = false;
}

/* ==== Schrittweises Aufdecken mit Sperrhinweisen =====================
   Bauform der Referenzdateien (SPEZIFIKATION.md §3). Eine Phase mit
   data-aufdecken="schrittweise" zeigt anfangs nur ph{n}-sub-1. Zwischen
   Teil k-1 und Teil k steht ein .subphase-lock-hint mit id ph{n}-lock-{k};
   sichtbar ist immer nur die unmittelbar naechste Sperre. Aufdecken ist
   monoton. Die Seite ruft revealSub(n, k) aus ihrer Prueffunktion auf,
   sobald die objektiv pruefbare Aufgabe geloest ist; der Knopf im
   Sperrhinweis ruft dieselbe Zeile ungated auf (Aufdeckmuster R1/R4).
   Das neu geoeffnete Teil wird direkt unter die Navigation gesetzt.
   ===================================================================== */
const SUB_REVEALED = {};
function revealSub(phase, part, keepPosition) {
  const sektion = document.getElementById('ph' + phase);
  if (!sektion) return;
  const total = sektion.querySelectorAll('.subphase[id^="ph' + phase + '-sub-"]').length;
  if (!total) return;
  const vorher = Math.min(total, SUB_REVEALED[phase] || 1);
  const ziel = Math.min(total, Math.max(vorher, part));
  for (let i = 1; i <= total; i++) {
    const teil = document.getElementById('ph' + phase + '-sub-' + i);
    if (teil) teil.classList.toggle('on', i <= ziel);
    const sperre = document.getElementById('ph' + phase + '-lock-' + i);
    if (sperre) sperre.style.display = (i === ziel + 1) ? '' : 'none';
  }
  SUB_REVEALED[phase] = ziel;
  if (typeof onSubReveal === 'function') onSubReveal(phase, ziel);
  if (part > vorher && !keepPosition) {
    const el = document.getElementById('ph' + phase + '-sub-' + ziel);
    if (el) {
      el.setAttribute('tabindex', '-1');
      setTimeout(() => {
        scrollToWithNavOffset(el);
        try { el.focus({ preventScroll: true }); } catch (e) { /* aeltere Browser */ }
      }, 50);
    }
  }
}

function initSubReveal() {
  document.querySelectorAll('.phase[data-aufdecken]').forEach(sektion => {
    revealSub(parseInt(sektion.id.replace('ph', ''), 10), 1, true);
  });
}

/* ==== Auswertungspanel ==============================================
   Generischer Reveal fuer .reveal-panel und .fazit. Der ungated Aufruf
   oeffnet die Auswertung, setzt die Station aber NICHT auf geloest —
   diese Entscheidung trifft die Stationslogik der Seite.
   ===================================================================== */
function revealPanel(id, hinweisId) {
  const panel = document.getElementById(id);
  if (panel) panel.classList.add('on');
  if (hinweisId) {
    const fb = document.getElementById(hinweisId);
    if (fb && !fb.innerHTML.trim()) {
      fb.className = 'feedback info';
      fb.innerHTML = 'Vergleiche deine Lösung mit der Auswertung und korrigiere sie bei Bedarf.';
    }
  }
  if (panel) setTimeout(() => scrollToWithNavOffset(panel), 50);
}

/* ==== Akkordeon =====================================================
   Die open-Klasse gehoert auf den Button (.acc-head), sonst greifen die
   Selektoren .acc-head.open .acc-icon und .acc-head.open + .acc-body nicht.
   ===================================================================== */
function toggleAcc(head) {
  head.setAttribute('aria-expanded', head.classList.toggle('open'));
}

/* ==== Tooltip am Fensterrand ========================================
   Die Sprechblase haengt links am Ausloeser. Steht der Ausloeser weit
   rechts, ragt sie ueber das Fenster hinaus und macht die Seite breiter.
   Wie weit sie verschoben werden muss, steht erst zur Laufzeit fest —
   CSS kann die Lage des Ausloesers nicht lesen.
   ===================================================================== */
function ttAusrichten(el) {
  const fenster = document.documentElement.clientWidth;
  const rand = 16;
  const breite = Math.min(280, fenster - 2 * rand);
  /* Bricht der Begriff um, haengt die Sprechblase am ERSTEN Zeilenstueck.
     getBoundingClientRect() umschliesst beide Zeilen und liefert dann die
     linke Kante der zweiten Zeile — die Verschiebung waere zu klein. */
  const stuecke = el.getClientRects();
  const links = stuecke.length ? stuecke[0].left : el.getBoundingClientRect().left;
  const ueber = links + breite - (fenster - rand);
  el.style.setProperty('--tt-shift', ueber > 0 ? -Math.ceil(ueber) + 'px' : '0px');
}

['pointerover', 'focusin'].forEach(ereignis => {
  document.addEventListener(ereignis, e => {
    const t = e.target && e.target.closest && e.target.closest('.tt');
    if (t) ttAusrichten(t);
  });
});

/* ==== Code kopieren ================================================= */
function copyCode(btn) {
  const block = btn.closest('.code-block');
  if (!block) return;
  const text = block.cloneNode(true);
  text.querySelectorAll('.copy-btn').forEach(b => b.remove());
  const roh = text.textContent.replace(/^\s+|\s+$/g, '');
  const fertig = () => { const alt = btn.textContent; btn.textContent = 'kopiert';
                         setTimeout(() => { btn.textContent = alt; }, 1400); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(roh).then(fertig, () => {});
  }
}

/* ==== Schaubild als PNG sichern =====================================
   Offline, ohne externe Bibliothek. Farben muessen im SVG explizit als
   Hex stehen — CSS-Variablen wirken im Export nicht
   (SPEZIFIKATION.md Abschnitt 10).
   ===================================================================== */
function saveSvgAsPng(svgId, dateiname) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const kasten = svg.getBoundingClientRect();
  const breite = Math.max(1, Math.round(kasten.width || svg.clientWidth || 800));
  const hoehe = Math.max(1, Math.round(kasten.height || svg.clientHeight || 600));
  const quelle = new XMLSerializer().serializeToString(svg);
  const bild = new Image();
  bild.onload = function () {
    const c = document.createElement('canvas');
    c.width = breite * 2; c.height = hoehe * 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bild, 0, 0, c.width, c.height);
    const a = document.createElement('a');
    a.download = (dateiname || svgId) + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
  };
  bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(quelle);
}

/* ==== Eingabeaufgaben (checkGroup / clearGroup) =====================
   Zweistufig wie das Quiz (DIDAKTIK.md §3a.7):
     1. Fehlversuch -> nur „x von y richtig“ und ein lösungsfreier Tipp.
        Bei 0/1-Feldern würde schon die Markierung eines Felds die Lösung
        verraten, deshalb wird noch nichts markiert.
     2. Fehlversuch -> falsche Felder markiert (.err, gestrichelt) und benannt,
        die Hilfe wird freigegeben.
   Markup (COMPONENTS.md, Eingabeaufgabe):
     <div id="g-x">
       <div class="field-row"><label>G1 =</label>
         <input class="eingabe eingabe--kurz" data-exp="0|null" inputmode="numeric"></div>
     </div>
     <div class="btn-row"><button class="btn btn-primary btn-sm" onclick="checkGroup('g-x')">✓ Prüfen</button> …</div>
     <div class="feedback" id="g-x-fb" aria-live="polite"></div>
   data-exp: zulässige Antworten, getrennt durch „|“ (Vergleich ohne
   Leerraum und ohne Groß-/Kleinschreibung).
   Die Seite kann festlegen – alles freiwillig, als globale Konstanten:
     GROUP_HINT  { 'g-x': 'lösungsfreier Tipp' }
     GROUP_HELP  { 'g-x': 'id-des-hilfeknopfs' }      (wird nach Versuch 2 freigegeben)
     SUBGATE     { 'g-x': [phase, teil] }             (revealSub bei Erfolg)
     GROUP_PANEL { 'g-x': 'id-eines-reveal-panel' }   (öffnet bei Erfolg oder nach Versuch 2)
     function groupFieldOk(input) { … }               (eigene Prüfung, z. B. Ausdrücke)
   ===================================================================== */
/* Globale Konstanten der Seite (const/function im Seitenskript) lesen, ohne
   dass die Seite sie an window hängen muss. */
function seitenwert(name) {
  try { return new Function('return typeof ' + name + ' !== "undefined" ? ' + name + ' : null')(); }
  catch (e) { return null; }
}

function normAntwort(s) {
  return String(s == null ? '' : s).replace(/\s+/g, '').toUpperCase();
}

function feldName(inp) {
  if (inp.getAttribute('aria-label')) return inp.getAttribute('aria-label');
  const lab = inp.id ? document.querySelector('label[for="' + inp.id + '"]') : null;
  return lab ? lab.textContent.replace(/\s*=\s*$/, '').trim() : 'ein Feld';
}

function feldRichtig(inp) {
  const eigen = seitenwert('groupFieldOk');
  if (typeof eigen === 'function') {
    const urteil = eigen(inp);
    if (urteil === true || urteil === false) return urteil;
  }
  return String(inp.dataset.exp).split('|').map(normAntwort).indexOf(normAntwort(inp.value)) >= 0;
}

function checkGroup(id) {
  const box = document.getElementById(id); if (!box) return;
  const inputs = Array.from(box.querySelectorAll('input[data-exp],input[data-sem]'));
  const fb = document.getElementById(id + '-fb'); const total = inputs.length;
  const tipps = seitenwert('GROUP_HINT') || {}, hilfen = seitenwert('GROUP_HELP') || {};
  const gates = seitenwert('SUBGATE') || {}, panels = seitenwert('GROUP_PANEL') || {};
  let right = 0, empty = 0; const falsch = [];
  inputs.forEach(i => {
    i.classList.remove('ok', 'err'); i.removeAttribute('aria-invalid');
    if (normAntwort(i.value) === '') { empty++; falsch.push(i); return; }
    if (feldRichtig(i)) right++; else falsch.push(i);
  });
  if (!fb) return;
  if (right === total) {
    inputs.forEach(i => { i.classList.add('ok'); i.setAttribute('aria-invalid', 'false'); });
    fb.textContent = '✓ Alles richtig – stark! (' + right + '/' + total + ')'; fb.className = 'feedback ok';
    fortschrittGeloest(id, !box.dataset.tries);   /* ohne FORTSCHRITT der Seite wirkungslos */
    delete box.dataset.tries;
    if (gates[id]) revealSub(gates[id][0], gates[id][1]);
    if (panels[id]) revealPanel(panels[id]);
    return;
  }
  if (empty === total) { fb.textContent = 'Trage zuerst deine Ergebnisse ein.'; fb.className = 'feedback err'; return; }
  const tries = (parseInt(box.dataset.tries || '0', 10)) + 1; box.dataset.tries = String(tries);
  const stand = right + ' von ' + total + ' richtig' + (empty ? ' (' + empty + ' noch leer)' : '') + '. ';
  const help = hilfen[id] ? document.getElementById(hilfen[id]) : null;
  if (tries === 1) {
    fb.textContent = stand + '💡 Tipp: ' + (tipps[id] || 'Rechne jedes Feld noch einmal nach.')
      + ' Prüfe selbst nach – beim nächsten Versuch werden die falschen Felder markiert.';
    fb.className = 'feedback err';
    return;
  }
  falsch.forEach(i => { i.classList.add('err'); i.setAttribute('aria-invalid', 'true'); });
  inputs.filter(i => falsch.indexOf(i) < 0).forEach(i => { i.classList.add('ok'); i.setAttribute('aria-invalid', 'false'); });
  const namen = falsch.slice(0, 6).map(feldName).join('; ') + (falsch.length > 6 ? ' …' : '');
  fb.textContent = stand + '✗ Nicht richtig: ' + namen + '. '
    + (help ? 'Die Hilfe darunter ist jetzt freigegeben.' : 'Vergleiche diese Felder noch einmal mit der Regel.');
  fb.className = 'feedback err';
  if (help) help.disabled = false;
  if (panels[id]) revealPanel(panels[id]);
}

function clearGroup(id) {
  const box = document.getElementById(id); if (!box) return;
  box.querySelectorAll('input[data-exp],input[data-sem]').forEach(i => {
    i.value = ''; i.classList.remove('ok', 'err'); i.removeAttribute('aria-invalid');
  });
  const fb = document.getElementById(id + '-fb'); if (fb) { fb.textContent = ''; fb.className = 'feedback'; }
}

/* ==== Begriffszuordnung per Klick (.match) ===========================
   Begriff wählen (.match-chip), dann Bedeutung anklicken (.match-zone mit
   data-correct). Geprüft wird gesammelt; der Begriffspool steht nie in der
   Reihenfolge der Bedeutungen – auch nicht nach dem Zurücksetzen.
     <div class="match">
       <div class="match-pool"><div class="match-chip" data-id="x" onclick="matchSelect(this)">Begriff</div>…</div>
       <div class="match-zone" data-correct="x" onclick="matchPlace(this)">
         <div class="match-slot">?</div><div class="match-def">Bedeutung</div></div>
       <div class="btn-row">…matchCheck(this) · matchReset(this) · matchReveal(this)…</div>
       <div class="feedback" aria-live="polite"></div>
     </div>
   ===================================================================== */
function matchBox(el) { return el.closest('.match'); }
function matchFb(box, text, gut) {
  const f = box.querySelector(':scope > .feedback'); if (!f) return;
  f.textContent = text; f.className = 'feedback' + (gut === true ? ' ok' : gut === false ? ' err' : '');
}
function matchMischen(box) {
  const pool = box.querySelector('.match-pool'); if (!pool) return;
  const chips = Array.from(pool.querySelectorAll('.match-chip'));
  const ziel = Array.from(box.querySelectorAll('.match-zone')).map(z => z.dataset.correct).join(',');
  for (let n = 0; n < 20; n++) {
    for (let i = chips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [chips[i], chips[j]] = [chips[j], chips[i]];
    }
    if (chips.map(c => c.dataset.id).join(',') !== ziel) break;
  }
  if (chips.length > 1 && chips.map(c => c.dataset.id).join(',') === ziel) chips.push(chips.shift());
  chips.forEach(c => pool.appendChild(c));
}
function matchSelect(el) {
  if (el.classList.contains('used')) return;
  const box = matchBox(el);
  box.querySelectorAll('.match-chip').forEach(c => c.classList.remove('sel'));
  if (box._sel === el) { box._sel = null; return; }
  box._sel = el; el.classList.add('sel');
}
function matchPlace(zone) {
  const box = matchBox(zone), sel = box._sel;
  if (!sel) { matchFb(box, 'Wähle zuerst einen Begriff.', false); return; }
  if (zone.classList.contains('filled')) return;
  zone.querySelector('.match-slot').textContent = sel.textContent; zone.dataset.filled = sel.dataset.id;
  zone.classList.add('filled'); sel.classList.add('used'); sel.classList.remove('sel'); box._sel = null;
  matchFb(box, 'Begriff abgelegt. Ordne weiter zu oder prüfe gesammelt.');
}
function matchCheck(btn) {
  const box = matchBox(btn); let ok = 0, total = 0;
  box.querySelectorAll('.match-zone').forEach(z => {
    total++; const gut = (z.dataset.filled || '') === z.dataset.correct;
    z.classList.remove('z-ok', 'z-err'); z.classList.add(gut ? 'z-ok' : 'z-err'); if (gut) ok++;
    const slot = z.querySelector('.match-slot');
    if (z.dataset.filled) slot.textContent = (gut ? '✓ ' : '✗ ') + slot.textContent.replace(/^[✓✗] /, '');
  });
  matchFb(box, ok + ' von ' + total + ' richtig zugeordnet.'
    + (ok < total ? ' Die mit ✗ markierten Zuordnungen stimmen nicht.' : ''), ok === total);
  if (ok === total && box.id) {
    fortschrittGeloest(box.id, !box.dataset.tries);
    delete box.dataset.tries;
  } else if (ok < total) {
    box.dataset.tries = String((parseInt(box.dataset.tries || '0', 10)) + 1);
  }
}
function matchReset(btn) {
  const box = matchBox(btn);
  box.querySelectorAll('.match-zone').forEach(z => {
    z.classList.remove('filled', 'z-ok', 'z-err'); delete z.dataset.filled;
    z.querySelector('.match-slot').textContent = '?';
  });
  box.querySelectorAll('.match-chip').forEach(c => c.classList.remove('used', 'sel')); box._sel = null;
  matchMischen(box);
  matchFb(box, '');
}
function matchReveal(btn) {
  const box = matchBox(btn);
  box.querySelectorAll('.match-zone').forEach(z => {
    const chip = box.querySelector('.match-chip[data-id="' + z.dataset.correct + '"]');
    if (!chip) return;
    z.querySelector('.match-slot').textContent = '✓ ' + chip.textContent;
    z.dataset.filled = z.dataset.correct; z.classList.add('filled', 'z-ok'); chip.classList.add('used');
  });
  matchFb(box, 'Lösungsweg für Nacharbeit eingetragen. Vergleiche jede Zuordnung mit der Bedeutung.', true);
  if (box.id) fortschrittGeloest(box.id, false);
}

/* ==== Reihenfolge per Klick (.reihenfolge) ===========================
   Karte antippen, sie belegt den nächsten freien Platz; gesammelt geprüft
   gegen data-correct. Trägt der Baustein eine id mit Eintrag in SUBGATE,
   öffnet die richtige Reihenfolge den nächsten Teil.
     <div class="reihenfolge" id="…" data-correct="s1,s2,s3">
       <div class="reihenfolge-pool"><div class="reihenfolge-karte" data-id="s2" onclick="reihenfolgeSelect(this)">…</div>…</div>
       <div class="reihenfolge-plaetze"><div class="reihenfolge-platz">—</div>…</div>
       <div class="btn-row">…reihenfolgeCheck(this) · reihenfolgeReset(this) · reihenfolgeReveal(this)…</div>
       <div class="feedback" aria-live="polite"></div>
     </div>
   ===================================================================== */
function reihenfolgeBox(el) { return el.closest('.reihenfolge'); }
function reihenfolgeMischen(box) {
  const pool = box.querySelector('.reihenfolge-pool'); if (!pool) return;
  const karten = Array.from(pool.querySelectorAll('.reihenfolge-karte'));
  const ziel = box.dataset.correct || '';
  for (let n = 0; n < 20; n++) {
    for (let i = karten.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [karten[i], karten[j]] = [karten[j], karten[i]];
    }
    if (karten.map(k => k.dataset.id).join(',') !== ziel) break;
  }
  if (karten.length > 1 && karten.map(k => k.dataset.id).join(',') === ziel) karten.push(karten.shift());
  karten.forEach(k => pool.appendChild(k));
}
function reihenfolgeSelect(el) {
  if (el.classList.contains('used')) return;
  const box = reihenfolgeBox(el);
  const frei = Array.from(box.querySelectorAll('.reihenfolge-platz')).find(p => !p.dataset.filled);
  if (!frei) return;
  frei.dataset.filled = el.dataset.id; frei.textContent = el.textContent; el.classList.add('used');
}
function reihenfolgeCheck(btn) {
  const box = reihenfolgeBox(btn), soll = (box.dataset.correct || '').split(','); let ok = 0;
  box.querySelectorAll('.reihenfolge-platz').forEach((p, i) => {
    const gut = (p.dataset.filled || '') === soll[i];
    p.classList.remove('z-ok', 'z-err'); p.classList.add(gut ? 'z-ok' : 'z-err'); if (gut) ok++;
  });
  matchFb(box, ok + ' von ' + soll.length + ' Schritten stehen an der richtigen Stelle.', ok === soll.length);
  const gates = seitenwert('SUBGATE') || {};
  if (ok === soll.length) {
    if (box.id) { fortschrittGeloest(box.id, !box.dataset.tries); delete box.dataset.tries; }
    if (box.id && gates[box.id]) revealSub(gates[box.id][0], gates[box.id][1]);
  } else {
    box.dataset.tries = String((parseInt(box.dataset.tries || '0', 10)) + 1);
  }
}
function reihenfolgeReset(btn) {
  const box = reihenfolgeBox(btn);
  box.querySelectorAll('.reihenfolge-platz').forEach(p => {
    p.classList.remove('z-ok', 'z-err'); delete p.dataset.filled; p.textContent = '—';
  });
  box.querySelectorAll('.reihenfolge-karte').forEach(k => k.classList.remove('used'));
  reihenfolgeMischen(box);
  matchFb(box, '');
}
function reihenfolgeReveal(btn) {
  const box = reihenfolgeBox(btn), soll = (box.dataset.correct || '').split(',');
  box.querySelectorAll('.reihenfolge-platz').forEach((p, i) => {
    const karte = box.querySelector('.reihenfolge-karte[data-id="' + soll[i] + '"]'); if (!karte) return;
    p.dataset.filled = soll[i]; p.textContent = karte.textContent;
    p.classList.remove('z-err'); p.classList.add('z-ok'); karte.classList.add('used');
  });
  matchFb(box, 'Lösungsweg für Nacharbeit eingetragen. Begründe jeden Übergang von einem Schritt zum nächsten.', true);
  if (box.id) fortschrittGeloest(box.id, false);
}

/* =====================================================================
   Parsons-Puzzle (.parsons) — Code in Reihenfolge und Einrückung
   ---------------------------------------------------------------------
   Lösung: die Vorratszeilen OHNE data-fehl in Markup-Reihenfolge, Einrückung
   in data-ebene (Stufen à vier Zeichen). Verglichen werden Text und Einrückung,
   nicht die Kennung: zwei gleiche Zeilen (z. B. zweimal „else:“) sind damit
   austauschbar.
   data-einrueckung:  frei        Reihenfolge und Einrückung sind gefragt
                      vorgegeben  Einrückung steht schon im Vorrat
                      ohne        nur Reihenfolge (SQL, Ablaufschritte)
   Rückmeldung zweistufig wie checkGroup/twoStageQuizCheck:
     1. Fehlversuch  Stand in Zahlen + lösungsfreier Tipp (data-hint)
     2. Fehlversuch  Zeilen markiert (✓ / ⇥ ? / ✗), Fehlzeilen erklärt
                     (data-erkl), Lösungsknopf freigegeben
   Mit id und SUBGATE-Eintrag öffnet die richtige Lösung den nächsten Teil.
   Keine Persistenz.
   Idee und Bewertung nach openpatch/bitflow, task-parsons (MIT-Lizenz,
   © 2021 Mike Barkmin), ohne React nachgebaut.
   ===================================================================== */
const PARSONS_STUFE = 4;   /* Zeichen je Einrückungsstufe, wie in Python */

function parsonsBox(el) { return el.closest('.parsons'); }
function parsonsModus(box) { return box.dataset.einrueckung || 'frei'; }
function parsonsText(z) { return z.textContent.replace(/\s+/g, ' ').trim(); }
function parsonsProgramm(box) { return box.querySelector('.parsons-programm'); }
function parsonsGesetzt(box) { return Array.from(parsonsProgramm(box).querySelectorAll(':scope > .parsons-zeile')); }

/* Lösung aus dem Markup: Vorratszeilen ohne data-fehl in Quelltext-Reihenfolge.
   Rein lesend, deshalb auch für Selbsttests der Seite nutzbar, die vor
   parsonsInit laufen (dann gilt die DOM-Reihenfolge, danach data-nr). */
function parsonsLoesungAusMarkup(box) {
  const zeilen = Array.from(box.querySelectorAll('.parsons-vorrat .parsons-zeile'));
  if (zeilen.every(z => z.dataset.nr !== undefined)) zeilen.sort((a, b) => a.dataset.nr - b.dataset.nr);
  return zeilen.filter(z => z.dataset.fehl !== '1')
    .map(z => ({ text: parsonsText(z), ebene: parseInt(z.dataset.ebene || '0', 10) }));
}

function parsonsInit(box) {
  const vorrat = Array.from(box.querySelectorAll('.parsons-vorrat .parsons-zeile'));
  vorrat.forEach((z, i) => {
    z.dataset.nr = String(i);
    z.style.setProperty('--ebene', z.dataset.ebene || '0');
    z.setAttribute('draggable', 'true');
    z.addEventListener('dragstart', e => parsonsZiehStart(e, z));
    z.addEventListener('dragend', () => parsonsZiehEnde(box));
  });
  box._loesung = parsonsLoesungAusMarkup(box);
  const prog = parsonsProgramm(box);
  prog.addEventListener('dragover', e => parsonsZiehUeber(e, box));
  prog.addEventListener('drop', e => parsonsAblegen(e, box));
  prog.addEventListener('dragleave', e => { if (!prog.contains(e.relatedTarget)) parsonsMarkeWeg(box); });
  const vorratFeld = box.querySelector('.parsons-vorrat');
  vorratFeld.addEventListener('dragover', e => { if (box._zug && box._zug.zeile) e.preventDefault(); });
  vorratFeld.addEventListener('drop', e => {
    e.preventDefault(); const z = box._zug && box._zug.zeile; parsonsMarkeWeg(box);
    if (z) parsonsZurueck(box, z);
  });
  parsonsMischen(box);
  parsonsWerkzeug(box);
}

/* Vorrat mischen, nie in Lösungsreihenfolge (wie reihenfolgeMischen) */
function parsonsMischen(box) {
  const feld = box.querySelector('.parsons-vorrat');
  const zeilen = Array.from(feld.querySelectorAll('.parsons-zeile'));
  const ziel = zeilen.map(z => z.dataset.nr).join(',');
  for (let n = 0; n < 20; n++) {
    for (let i = zeilen.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [zeilen[i], zeilen[j]] = [zeilen[j], zeilen[i]];
    }
    if (zeilen.map(z => z.dataset.nr).join(',') !== ziel) break;
  }
  if (zeilen.length > 1 && zeilen.map(z => z.dataset.nr).join(',') === ziel) zeilen.push(zeilen.shift());
  zeilen.forEach(z => feld.appendChild(z));
}

/* Zeile im Programm anlegen; Einrückung im Modus „vorgegeben" aus data-ebene */
function parsonsNeueZeile(box, quelle, ebene) {
  const li = document.createElement('li');
  li.className = 'parsons-zeile';
  li.textContent = quelle.textContent;
  li.dataset.nr = quelle.dataset.nr;
  li.tabIndex = 0;
  li.setAttribute('draggable', 'true');
  parsonsEbeneSetzen(li, parsonsModus(box) === 'vorgegeben' ? parseInt(quelle.dataset.ebene || '0', 10) : ebene);
  li.addEventListener('click', () => parsonsAuswahl(box, li));   /* wählt immer; Esc hebt auf */
  li.addEventListener('keydown', e => parsonsTaste(e, box, li));
  li.addEventListener('dragstart', e => parsonsZiehStart(e, li));
  li.addEventListener('dragend', () => parsonsZiehEnde(box));
  return li;
}
function parsonsEbeneSetzen(li, ebene) {
  li.dataset.ebeneIst = String(ebene);
  li.style.setProperty('--ebene', String(ebene));
}
function parsonsEbene(li) { return parseInt(li.dataset.ebeneIst || '0', 10); }
function parsonsQuelle(box, li) { return box.querySelector('.parsons-vorrat .parsons-zeile[data-nr="' + li.dataset.nr + '"]'); }

function parsonsWaehlen(btn) {
  const box = parsonsBox(btn); if (btn.classList.contains('used') || box.dataset.fertig) return;
  const li = parsonsNeueZeile(box, btn, parsonsStartEbene(box));
  parsonsProgramm(box).appendChild(li);
  btn.classList.add('used');
  parsonsGeaendert(box, 'Zeile ' + parsonsGesetzt(box).length + ' eingefügt: ' + parsonsText(li));
  parsonsAuswahl(box, li);
  /* Fokus bleibt im Vorrat, damit man Zeile um Zeile antippen kann */
  const naechste = box.querySelector('.parsons-vorrat .parsons-zeile:not(.used)');
  if (naechste) naechste.focus({ preventScroll: true }); else li.focus({ preventScroll: true });
}

/* Stufe einer neu angehängten Zeile im Modus „frei":
   Standard 0 – jede Zeile verlangt eine eigene Entscheidung zur Einrückung.
   data-start="thonny": wie der Editor – gleiche Stufe wie die letzte Zeile,
   nach einem Doppelpunkt eine tiefer; offen bleibt nur das Blockende. */
function parsonsStartEbene(box) {
  if (box.dataset.start !== 'thonny') return 0;
  const alle = parsonsGesetzt(box), letzte = alle[alle.length - 1];
  if (!letzte) return 0;
  return parsonsEbene(letzte) + (/:\s*(#.*)?$/.test(parsonsText(letzte)) ? 1 : 0);
}

function parsonsAuswahl(box, li) {
  parsonsGesetzt(box).forEach(z => { z.classList.toggle('gewaehlt', z === li); z.setAttribute('aria-selected', String(z === li)); });
  box._gewaehlt = li || null;
  parsonsWerkzeug(box);
}
function parsonsWerkzeug(box) {
  const an = !!box._gewaehlt && !box.dataset.fertig;
  box.querySelectorAll('.parsons-werkzeug .btn').forEach(b => { b.disabled = !an; });
}

/* Größte zulässige Einrückung: eine Stufe tiefer als die Zeile davor */
function parsonsMaxEbene(box, li) {
  const vor = li.previousElementSibling;
  return vor && vor.classList.contains('parsons-zeile') ? parsonsEbene(vor) + 1 : 0;
}

function parsonsAktion(btn, was) {
  const box = parsonsBox(btn), li = box._gewaehlt; if (!li || box.dataset.fertig) return;
  parsonsAusfuehren(box, li, was);
}
function parsonsAusfuehren(box, li, was) {
  if (box.dataset.fertig) return;
  const prog = parsonsProgramm(box), frei = parsonsModus(box) === 'frei';
  if (was === 'hoch' && li.previousElementSibling) prog.insertBefore(li, li.previousElementSibling);
  else if (was === 'runter' && li.nextElementSibling) prog.insertBefore(li.nextElementSibling, li);
  else if (was === 'ein' && frei) parsonsEbeneSetzen(li, Math.min(parsonsEbene(li) + 1, parsonsMaxEbene(box, li)));
  else if (was === 'aus' && frei) parsonsEbeneSetzen(li, Math.max(parsonsEbene(li) - 1, 0));
  else if (was === 'weg') { parsonsZurueck(box, li); return; }
  else return;
  const pos = parsonsGesetzt(box).indexOf(li) + 1;
  parsonsGeaendert(box, 'Zeile ' + pos + (frei ? ', Einrückung ' + parsonsEbene(li) : '') + ': ' + parsonsText(li));
  li.focus({ preventScroll: true });
}
function parsonsZurueck(box, li) {
  if (box.dataset.fertig) return;
  const q = parsonsQuelle(box, li); if (q) q.classList.remove('used');
  const nach = li.nextElementSibling || li.previousElementSibling;
  li.remove();
  parsonsAuswahl(box, null);
  parsonsGeaendert(box, 'Zurück in den Vorrat: ' + parsonsText(q || li));
  if (nach) nach.focus({ preventScroll: true }); else if (q) q.focus({ preventScroll: true });
}

function parsonsTaste(e, box, li) {
  const k = { ArrowUp: 'hoch', ArrowDown: 'runter', ArrowLeft: 'aus', ArrowRight: 'ein', Delete: 'weg', Backspace: 'weg' }[e.key];
  if (k) { e.preventDefault(); parsonsAuswahl(box, li); parsonsAusfuehren(box, li, k); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); parsonsAuswahl(box, li); }
  else if (e.key === 'Escape') { e.preventDefault(); parsonsAuswahl(box, null); }
}

/* Jede Änderung nimmt die Markierung des letzten Prüfens zurück */
function parsonsGeaendert(box, ansage) {
  parsonsGesetzt(box).forEach(z => { z.classList.remove('z-ok', 'z-ebene', 'z-err'); delete z.dataset.urteil; });
  box.querySelector('.parsons-aufloesung').innerHTML = '';
  matchFb(box, '');
  const a = box.querySelector('.parsons-ansage'); if (a && ansage) a.textContent = ansage;
}

/* ---- Ziehen (Zusatz; Klick und Tastatur bleiben vollständig) -------- */
function parsonsZiehStart(e, z) {
  const box = parsonsBox(z);
  if (box.dataset.fertig || z.classList.contains('used')) { e.preventDefault(); return; }
  box._zug = { quelle: z.tagName === 'LI' ? null : z, zeile: z.tagName === 'LI' ? z : null };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', parsonsText(z));
  z.classList.add('zieht');
}
function parsonsZiehEnde(box) {
  box.querySelectorAll('.zieht').forEach(z => z.classList.remove('zieht'));
  parsonsMarkeWeg(box); box._zug = null;
}
function parsonsZeichenBreite(box) {
  if (!box._ch) {
    const s = document.createElement('span');
    s.style.cssText = 'position:absolute;visibility:hidden;font-family:var(--font-mono);font-size:var(--fs-base);white-space:pre';
    s.textContent = '0000000000'; box.appendChild(s);
    box._ch = { ch: s.getBoundingClientRect().width / 10, em: parseFloat(getComputedStyle(s).fontSize) };
    s.remove();
  }
  return box._ch;
}
function parsonsZielStelle(e, box) {
  const prog = parsonsProgramm(box), zug = box._zug;
  const andere = parsonsGesetzt(box).filter(z => z !== zug.zeile);
  let index = andere.length;
  for (let i = 0; i < andere.length; i++) {
    const r = andere[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { index = i; break; }
  }
  let ebene = 0;
  if (parsonsModus(box) === 'frei') {
    /* Textbeginn einer Zeile: Innenabstand des Programms + Spalte der
       Zeilennummer (3em in der Codeschrift); je Stufe vier Zeichen. */
    const r = prog.getBoundingClientRect(), cs = getComputedStyle(prog);
    const start = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) + parsonsZeichenBreite(box).em * 3;
    const stufe = parsonsZeichenBreite(box).ch * PARSONS_STUFE;
    const vor = andere[index - 1];
    const max = vor ? parsonsEbene(vor) + 1 : 0;
    ebene = Math.max(0, Math.min(max, Math.round((e.clientX - start) / stufe)));
  } else if (parsonsModus(box) === 'vorgegeben') {
    const q = zug.quelle || parsonsQuelle(box, zug.zeile);
    ebene = parseInt(q.dataset.ebene || '0', 10);
  }
  return { index, ebene, andere };
}
function parsonsZiehUeber(e, box) {
  if (!box._zug) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  const { index, ebene, andere } = parsonsZielStelle(e, box);
  let m = box.querySelector('.parsons-marke');
  if (!m) { m = document.createElement('li'); m.className = 'parsons-marke'; m.setAttribute('aria-hidden', 'true'); }
  m.style.setProperty('--ebene', String(ebene));
  const prog = parsonsProgramm(box);
  if (index < andere.length) prog.insertBefore(m, andere[index]); else prog.appendChild(m);
}
function parsonsMarkeWeg(box) { const m = box.querySelector('.parsons-marke'); if (m) m.remove(); }
function parsonsAblegen(e, box) {
  if (!box._zug) return;
  e.preventDefault();
  const { index, ebene, andere } = parsonsZielStelle(e, box);
  parsonsMarkeWeg(box);
  const prog = parsonsProgramm(box), zug = box._zug;
  let li = zug.zeile;
  if (!li) { li = parsonsNeueZeile(box, zug.quelle, ebene); zug.quelle.classList.add('used'); }
  else if (parsonsModus(box) === 'frei') parsonsEbeneSetzen(li, ebene);
  if (index < andere.length) prog.insertBefore(li, andere[index]); else prog.appendChild(li);
  parsonsGeaendert(box, 'Zeile ' + (parsonsGesetzt(box).indexOf(li) + 1) + ' abgelegt: ' + parsonsText(li));
  parsonsAuswahl(box, li); li.focus({ preventScroll: true });
}

/* ---- Bewerten ------------------------------------------------------- */
/* Reihenfolge und Einrückung getrennt, Platz für Platz (wie bitflow):
   Wer die Reihenfolge hat, aber die Verschachtelung nicht, hat schon viel
   verstanden, und die Rückmeldung kann sagen, welche Hälfte fehlt. */
function parsonsUrteil(box) {
  const soll = box._loesung, ist = parsonsGesetzt(box), modus = parsonsModus(box), frei = modus === 'frei';
  const zeilen = ist.map((li, i) => {
    const q = parsonsQuelle(box, li), s = soll[i];
    const fehl = !!q && q.dataset.fehl === '1';
    /* „vorgegeben": Die Einrückung gehört zur Karte. Zwei Karten „else:" mit
       verschiedener Einrückung sind dann verschieden, nicht austauschbar. */
    const platz = !fehl && !!s && s.text === parsonsText(li) && (modus !== 'vorgegeben' || s.ebene === parsonsEbene(li));
    const ebene = !frei || (platz && s.ebene === parsonsEbene(li));
    return { li, q, fehl, platz, ebene };
  });
  const platz = zeilen.filter(z => z.platz).length;
  const ebene = zeilen.filter(z => z.platz && z.ebene).length;
  const fehl = zeilen.filter(z => z.fehl).length;
  const fehlend = soll.length - zeilen.filter(z => !z.fehl).length;
  const geloest = ist.length === soll.length && platz === soll.length && ebene === soll.length;
  return { zeilen, platz, ebene, fehl, fehlend, n: soll.length, geloest, frei };
}

/* Rückgabe: true gelöst, false falsch, undefined nicht gewertet (leer,
   unvollständig oder schon gelöst) – für Seiten, die den ersten Versuch selbst verbuchen. */
function parsonsPruefen(btn) {
  const box = parsonsBox(btn); if (box.dataset.fertig) return undefined;
  const u = parsonsUrteil(box);
  parsonsGeaendert(box, '');
  if (!u.zeilen.length) { matchFb(box, 'Füge zuerst Zeilen ins Programm ein.', false); return undefined; }
  /* Unvollständig: nicht werten, kein Versuch verbraucht. Ohne Zahl, damit die
     Zahl der Fehlzeilen im Vorrat nicht verraten wird. */
  if (u.zeilen.length < u.n) { matchFb(box, 'Dein Programm ist noch nicht vollständig – es fehlen noch Zeilen.', false); return undefined; }
  if (u.geloest) {
    u.zeilen.forEach(z => { z.li.classList.add('z-ok'); z.li.dataset.urteil = 'ok'; });
    matchFb(box, '✓ Richtig – Reihenfolge' + (u.frei ? ' und Einrückung stimmen' : ' stimmt') + '. (' + u.n + ' Zeilen)', true);
    box.dataset.fertig = '1'; parsonsAuswahl(box, null);
    const gates = seitenwert('SUBGATE') || {};
    if (box.id) { fortschrittGeloest(box.id, !box.dataset.tries); delete box.dataset.tries; }
    if (box.id && gates[box.id]) revealSub(gates[box.id][0], gates[box.id][1]);
    return true;
  }
  const tries = parseInt(box.dataset.tries || '0', 10) + 1; box.dataset.tries = String(tries);
  let stand = 'Reihenfolge: ' + u.platz + ' von ' + u.n + ' Zeilen an der richtigen Stelle.';
  if (u.frei) stand += ' Einrückung: ' + u.ebene + ' davon richtig eingerückt.';
  if (u.fehl) stand += ' ' + (u.fehl === 1 ? 'Eine Zeile gehört' : u.fehl + ' Zeilen gehören') + ' nicht ins Programm.';
  if (u.fehlend > 0) stand += ' Es ' + (u.fehlend === 1 ? 'fehlt noch eine Zeile.' : 'fehlen noch ' + u.fehlend + ' Zeilen.');
  if (tries === 1) {
    matchFb(box, stand + ' 💡 Tipp: ' + (box.dataset.hint || 'Lies das Programm Zeile für Zeile so, wie Python es ausführt.')
      + ' Beim nächsten Prüfen werden die Zeilen markiert.', false);
    return false;
  }
  u.zeilen.forEach(z => {
    const k = z.fehl || !z.platz ? 'z-err' : !z.ebene ? 'z-ebene' : 'z-ok';
    z.li.classList.add(k); z.li.dataset.urteil = k;
  });
  const liste = box.querySelector('.parsons-aufloesung');
  u.zeilen.filter(z => z.fehl).forEach(z => {
    const p = document.createElement('li');
    const c = document.createElement('code'); c.textContent = parsonsText(z.li);
    p.appendChild(c); p.appendChild(document.createTextNode(' gehört nicht hinein: ' + (z.q.dataset.erkl || '')));
    liste.appendChild(p);
  });
  const loes = box.querySelector('[onclick^="parsonsLoesung"]');
  matchFb(box, stand + ' ✗ Markiert: ✓ richtig' + (u.frei ? ', ⇥ ? richtige Stelle, falsche Einrückung' : '')
    + ', ✗ falsche Stelle oder Zeile gehört nicht hinein.' + (loes ? ' Die Lösung ist jetzt freigegeben.' : ''), false);
  if (loes) loes.disabled = false;
  return false;
}

function parsonsReset(btn) {
  const box = parsonsBox(btn);
  delete box.dataset.fertig;
  parsonsProgramm(box).innerHTML = '';
  box.querySelectorAll('.parsons-vorrat .parsons-zeile').forEach(z => z.classList.remove('used'));
  parsonsMischen(box); parsonsAuswahl(box, null); parsonsGeaendert(box, 'Zurückgesetzt.');
}

/* Lösung für Nacharbeit: erst nach zwei Fehlversuchen freigegeben */
function parsonsLoesung(btn) {
  const box = parsonsBox(btn), prog = parsonsProgramm(box);
  prog.innerHTML = '';
  const vorrat = Array.from(box.querySelectorAll('.parsons-vorrat .parsons-zeile'));
  vorrat.forEach(z => z.classList.remove('used'));
  vorrat.filter(z => z.dataset.fehl !== '1')
    .sort((a, b) => parseInt(a.dataset.nr, 10) - parseInt(b.dataset.nr, 10))
    .forEach(z => {
      const li = parsonsNeueZeile(box, z, parseInt(z.dataset.ebene || '0', 10));
      li.classList.add('z-ok'); li.dataset.urteil = 'ok'; prog.appendChild(li); z.classList.add('used');
    });
  const liste = box.querySelector('.parsons-aufloesung'); liste.innerHTML = '';
  vorrat.filter(z => z.dataset.fehl === '1').forEach(z => {
    const p = document.createElement('li');
    const c = document.createElement('code'); c.textContent = parsonsText(z);
    p.appendChild(c); p.appendChild(document.createTextNode(' gehört nicht hinein: ' + (z.dataset.erkl || '')));
    liste.appendChild(p);
  });
  matchFb(box, 'Lösung für Nacharbeit eingetragen. Erkläre zu jeder Zeile, warum sie dort steht'
    + (parsonsModus(box) === 'frei' ? ' und so weit eingerückt ist.' : '.'), true);
  box.dataset.fertig = '1'; parsonsAuswahl(box, null);
  if (box.id) fortschrittGeloest(box.id, false);
}

/* ==== Fehlersuche (.fehlersuche) =====================================
   Nummerierte Stellen (Schaubild, Schema, Text) als Knöpfe; die fehlerhaften
   tragen data-fehler="1". Jede Stelle erklärt sich in data-erkl. Geprüft wird
   gesammelt: 1. Versuch nur „x von y gefunden“ und data-hint des Bausteins,
   2. Versuch Auflösung je Stelle. Mit id und SUBGATE-Eintrag öffnet der
   Baustein danach den nächsten Teil.
     <div class="fehlersuche" id="…" data-hint="lösungsfreier Tipp">
       <div class="fehlersuche-stellen">
         <button class="fehlersuche-stelle" type="button" aria-pressed="false" data-fehler="1"
                 data-erkl="…" onclick="fehlersucheWahl(this)">Stelle 1</button> …
       </div>
       <div class="btn-row">…fehlersuchePruefen(this) · fehlersucheReset(this)…</div>
       <div class="feedback" aria-live="polite"></div>
       <ol class="fehlersuche-aufloesung"></ol>
     </div>
   ===================================================================== */
function fehlersucheBox(el) { return el.closest('.fehlersuche'); }
function fehlersucheWahl(btn) {
  const box = fehlersucheBox(btn); if (box.dataset.fertig) return;
  const an = !btn.classList.contains('gewaehlt');
  btn.classList.toggle('gewaehlt', an); btn.setAttribute('aria-pressed', String(an));
}
function fehlersucheAufloesen(box) {
  const liste = box.querySelector('.fehlersuche-aufloesung'); if (!liste) return;
  liste.innerHTML = '';
  box.querySelectorAll('.fehlersuche-stelle').forEach(s => {
    const li = document.createElement('li');
    const b = document.createElement('strong');
    b.textContent = s.textContent.trim() + (s.dataset.fehler === '1' ? ' · Fehler: ' : ' · richtig: ');
    li.appendChild(b); li.appendChild(document.createTextNode(s.dataset.erkl || ''));
    liste.appendChild(li);
  });
}
function fehlersuchePruefen(btn) {
  const box = fehlersucheBox(btn); if (box.dataset.fertig) return;
  const stellen = Array.from(box.querySelectorAll('.fehlersuche-stelle'));
  const fehler = stellen.filter(s => s.dataset.fehler === '1');
  const gefunden = fehler.filter(s => s.classList.contains('gewaehlt'));
  const zuviel = stellen.filter(s => s.dataset.fehler !== '1' && s.classList.contains('gewaehlt'));
  const gates = seitenwert('SUBGATE') || {};
  const oeffnen = () => { if (box.id && gates[box.id]) revealSub(gates[box.id][0], gates[box.id][1]); };
  if (gefunden.length === fehler.length && !zuviel.length) {
    box.dataset.fertig = '1';
    fehler.forEach(s => s.classList.add('z-ok'));
    stellen.forEach(s => { s.disabled = true; });
    matchFb(box, '✅ Alle ' + fehler.length + ' Fehler gefunden, keine richtige Stelle markiert. Die Begründungen stehen darunter.', true);
    if (box.id) fortschrittGeloest(box.id, !box.dataset.versuche);
    fehlersucheAufloesen(box); oeffnen(); return;
  }
  const versuche = parseInt(box.dataset.versuche || '0', 10) + 1;
  box.dataset.versuche = String(versuche);
  if (versuche === 1) {
    matchFb(box, '💡 ' + gefunden.length + ' von ' + fehler.length + ' Fehlern gefunden'
      + (zuviel.length ? ', dazu ' + zuviel.length + ' Stelle(n) markiert, die richtig sind' : '') + '. '
      + (box.dataset.hint || '') + ' Du hast noch einen Versuch.');
    return;
  }
  box.dataset.fertig = '1';
  stellen.forEach(s => {
    s.disabled = true;
    if (s.dataset.fehler === '1') s.classList.add(s.classList.contains('gewaehlt') ? 'z-ok' : 'z-offen');
    else if (s.classList.contains('gewaehlt')) s.classList.add('z-err');
  });
  matchFb(box, '❌ Grün: gefunden · Gelb: übersehen · Rot: markiert, aber richtig. Die Begründung zu jeder Stelle steht darunter.', false);
  if (box.id) fortschrittGeloest(box.id, false);
  fehlersucheAufloesen(box); oeffnen();
}
function fehlersucheReset(btn) {
  const box = fehlersucheBox(btn);
  delete box.dataset.fertig; delete box.dataset.versuche;
  box.querySelectorAll('.fehlersuche-stelle').forEach(s => {
    s.disabled = false; s.classList.remove('gewaehlt', 'z-ok', 'z-err', 'z-offen'); s.setAttribute('aria-pressed', 'false');
  });
  const liste = box.querySelector('.fehlersuche-aufloesung'); if (liste) liste.innerHTML = '';
  matchFb(box, '');
}

/* ==== Tabellenvorschau (.tabellenvorschau) ===========================
   Werkzeug zum Ausprobieren, schaltet nichts frei (vorher eine Vorhersage
   verlangen, AUFDECKMUSTER_STATIONEN.md R5). Die Daten stehen als Konstante im
   Seitenskript, der Baustein nennt ihren Namen:
     <div class="tabellenvorschau" id="…" data-quelle="MEINE_VORSCHAU"></div>
     const MEINE_VORSCHAU = {
       frage1: 'Beziehung', frage2: 'Wohin kommt der Fremdschlüssel?', start: 'Wähle …',
       gruppen: [{ knopf: 'schreibt (1:n)', varianten: [{ knopf: '…', urteil: '…',
         tabellen: [{ name: 'Nutzer', spalten: ['NutzerNr', 'Name'], schluessel: 1,
                      zeilen: [['N1', 'Lena'], ['N2', { w: 'Jonas', markiert: true }]] }] }] }]
     };
   Zellen: „a, b“ oder „a; b“ = mehrere Werte (rot), '' = leeres Feld (gestreift), {w, markiert}
   = frei markiert (gelb, mit ⚠️), {w, betont} = gelb ohne ⚠️ (zum Zählen, kein Fehler),
   {w, mehr} = mehrere Werte (rot), auch ohne Trennzeichen („H01 Hoodie S ×1“).
   Bei nur einer Gruppe entfällt die erste Auswahl.
   ===================================================================== */
/* ==== Klickstrecke ==================================================
   Ein Weg in Schritten (DIDAKTIK.md „Klickstrecke“): ein Schritt sichtbar,
   Pfad mit erledigten Schritten oben, Vor/Zurück und Stand unten. Der Pfad
   entsteht aus data-titel der Schritte. Keine Persistenz, kein Scrollen.
   In der Vollansicht zeigt das CSS alle Schritte untereinander.
   ===================================================================== */
function klickstreckeBox(el) { return el.closest('.klickstrecke'); }
function klickstreckeZeigen(box, n) {
  const schritte = [...box.querySelectorAll('.klickstrecke-schritt')];
  n = Math.max(0, Math.min(schritte.length - 1, n));
  box.dataset.schritt = String(n);
  schritte.forEach((s, i) => s.classList.toggle('on', i === n));
  box.querySelectorAll('.klickstrecke-pfad li').forEach((li, i) => {
    li.classList.toggle('aktiv', i === n);
    li.classList.toggle('erledigt', i < n);
    const b = li.querySelector('button');
    if (b) b.setAttribute('aria-current', i === n ? 'step' : 'false');
  });
  const zurueck = box.querySelector('.klickstrecke-zurueck'), weiter = box.querySelector('.klickstrecke-weiter');
  if (zurueck) zurueck.disabled = n === 0;
  if (weiter) weiter.disabled = n === schritte.length - 1;
  const stand = box.querySelector('.klickstrecke-stand');
  if (stand) stand.textContent = 'Schritt ' + (n + 1) + ' von ' + schritte.length;
}
function klickstreckeSchritt(btn, d) {
  const box = klickstreckeBox(btn);
  klickstreckeZeigen(box, Number(box.dataset.schritt || 0) + d);
}
function klickstreckeGehe(btn, n) { klickstreckeZeigen(klickstreckeBox(btn), n); }
/* ==== Gezeichnetes Struktogramm (.struktogramm-zeichnen) ============
   Freiwilliger Baustein (COMPONENTS.md §9): Kurs-Pseudocode aus
   .struktogramm-zeichnen-quelle wird mit der StruktoLab-Anzeige
   (assets/struktolab/struktolab-renderer.umd.js, nur auf Seiten, die sie
   einbinden) als Struktogramm in Kursnotation gezeichnet. Ohne das Skript
   bleibt der Pseudocode sichtbar; danach bleibt er für Bildschirmleser
   lesbar (.gezeichnet blendet ihn nur optisch aus).
   ===================================================================== */
function struktogrammZeichnenInit(box) {
  if (!window.customElements || !customElements.get('struktolab-renderer')) return;
  const quelle = box.querySelector('.struktogramm-zeichnen-quelle');
  if (!quelle || box.querySelector('struktolab-renderer')) return;
  const bild = document.createElement('struktolab-renderer');
  bild.setAttribute('lang', 'kurs');
  bild.setAttribute('color-mode', 'bw');
  bild.setAttribute('font-size', '16');
  bild.setAttribute('aria-hidden', 'true');        /* Inhalt liest der Bildschirmleser aus der Quelle */
  /* Zeichenbreite = Kartenbreite, damit die Schrift nicht mitskaliert */
  const breite = () => {
    const w = Math.round(box.clientWidth);
    if (w > 0 && String(w) !== bild.getAttribute('width')) bild.setAttribute('width', String(Math.max(240, w)));
  };
  breite();
  box.appendChild(bild);
  bild.pseudocode = quelle.textContent;
  box.classList.add('gezeichnet');
  if (window.ResizeObserver) new ResizeObserver(breite).observe(box);
}

function klickstreckeInit(box) {
  const pfad = box.querySelector('.klickstrecke-pfad');
  if (pfad && !pfad.children.length) {
    box.querySelectorAll('.klickstrecke-schritt').forEach((s, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button';
      b.textContent = s.dataset.titel || ('Schritt ' + (i + 1));
      b.addEventListener('click', () => klickstreckeGehe(b, i));
      li.appendChild(b); pfad.appendChild(li);
    });
  }
  klickstreckeZeigen(box, 0);
}

function tabellenvorschauEsc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function tabellenvorschauZelle(w) {
  if (w && typeof w === 'object') {
    if (w.mehr) return '<td class="tabellenvorschau-mehr" title="mehrere Werte in einer Zelle">' + tabellenvorschauEsc(w.w) + ' ⚠️</td>';
    if (w.betont) return '<td class="tabellenvorschau-markiert">' + tabellenvorschauEsc(w.w) + '</td>';
    return '<td class="tabellenvorschau-markiert">' + tabellenvorschauEsc(w.w) + ' ⚠️</td>';
  }
  if (w === '') return '<td class="tabellenvorschau-leer" title="leeres Feld">leer</td>';
  if (/, |; /.test(String(w))) return '<td class="tabellenvorschau-mehr" title="mehrere Werte in einer Zelle">' + tabellenvorschauEsc(w) + ' ⚠️</td>';
  return '<td>' + tabellenvorschauEsc(w) + '</td>';
}
function tabellenvorschauTabelle(tab) {
  const kopf = tab.spalten.map((s, i) => '<th scope="col">' + (i < (tab.schluessel || 0) ? '<u>' + tabellenvorschauEsc(s) + '</u>' : tabellenvorschauEsc(s)) + '</th>').join('');
  const rumpf = tab.zeilen.map(z => '<tr>' + z.map(tabellenvorschauZelle).join('') + '</tr>').join('');
  return '<div><p class="tabellenvorschau-name">' + tabellenvorschauEsc(tab.name) + '</p><div class="table-scroll"><table><thead><tr>' + kopf + '</tr></thead><tbody>' + rumpf + '</tbody></table></div></div>';
}
function tabellenvorschauZeichnen(box) {
  const d = seitenwert(box.dataset.quelle); if (!d || !d.gruppen) return;
  const g = parseInt(box.dataset.gruppe || '0', 10), gruppe = d.gruppen[g];
  const v = box.dataset.variante === undefined ? null : parseInt(box.dataset.variante, 10);
  let html = '';
  if (d.gruppen.length > 1) html += '<p class="tabellenvorschau-frage">' + tabellenvorschauEsc(d.frage1 || 'Fall') + '</p><div class="tabellenvorschau-wahl" role="group" aria-label="' + tabellenvorschauEsc(d.frage1 || 'Fall') + '">' +
    d.gruppen.map((gr, i) => '<button class="btn btn-ghost btn-sm" type="button" aria-pressed="' + (i === g) + '" onclick="tabellenvorschauWahl(this,' + i + ',null)">' + tabellenvorschauEsc(gr.knopf) + '</button>').join('') + '</div>';
  html += '<p class="tabellenvorschau-frage">' + tabellenvorschauEsc(d.frage2 || 'Variante') + '</p><div class="tabellenvorschau-wahl" role="group" aria-label="' + tabellenvorschauEsc(d.frage2 || 'Variante') + '">' +
    gruppe.varianten.map((va, i) => '<button class="btn btn-ghost btn-sm" type="button" aria-pressed="' + (i === v) + '" onclick="tabellenvorschauWahl(this,' + g + ',' + i + ')">' + tabellenvorschauEsc(va.knopf) + '</button>').join('') + '</div>';
  html += '<div aria-live="polite">' + (v === null
    ? '<p class="tabellenvorschau-urteil">' + tabellenvorschauEsc(d.start || 'Wähle eine Variante.') + '</p>'
    : '<div class="tabellenvorschau-tabellen">' + gruppe.varianten[v].tabellen.map(tabellenvorschauTabelle).join('') + '</div><p class="tabellenvorschau-urteil">' + tabellenvorschauEsc(gruppe.varianten[v].urteil) + '</p>') + '</div>';
  box.innerHTML = html;
}
function tabellenvorschauWahl(btn, g, v) {
  const box = btn.closest('.tabellenvorschau');
  if (g !== parseInt(box.dataset.gruppe || '0', 10) || v === null) { box.dataset.gruppe = String(g); delete box.dataset.variante; }
  else box.dataset.variante = String(v);
  tabellenvorschauZeichnen(box);
}

/* ==== Kreuzworträtsel (.kreuzwort) ===================================
   Das Gitter entsteht aus data-rows (Zeilen durch "/" getrennt, "." = leer);
   die Nummern werden wie im Zeitungsrätsel vergeben, zeilenweise.
     <div class="kreuzwort" data-rows="..A../.BCD./..E..">
       <div class="kreuzwort-gitter"></div>
       <div class="two-col kreuzwort-hinweise">…Waagerecht / Senkrecht…</div>
       <div class="btn-row">…kreuzwortCheck(this) · kreuzwortReveal(this)…</div>
       <div class="feedback" aria-live="polite"></div>
     </div>
   ===================================================================== */
function kreuzwortBox(el) { return el.closest('.kreuzwort'); }
function kreuzwortBuild(box) {
  const rows = (box.dataset.rows || '').split('/'); if (!rows[0]) return;
  const W = rows[0].length, gitter = box.querySelector('.kreuzwort-gitter'); if (!gitter) return;
  gitter.style.gridTemplateColumns = 'repeat(' + W + ',36px)';
  const L = (r, c) => (r >= 0 && r < rows.length && c >= 0 && c < rows[r].length) ? rows[r][c] : '.';
  const nummer = {}; let n = 0;
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < W; c++) {
    if (L(r, c) === '.') continue;
    if ((L(r, c - 1) === '.' && L(r, c + 1) !== '.') || (L(r - 1, c) === '.' && L(r + 1, c) !== '.')) nummer[r + '-' + c] = ++n;
  }
  let html = '';
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < W; c++) {
    const ch = L(r, c);
    if (ch === '.') { html += '<div class="kreuzwort-feld kreuzwort-feld--leer"></div>'; continue; }
    const nr = nummer[r + '-' + c];
    html += '<div class="kreuzwort-feld">' + (nr ? '<span class="kreuzwort-nr">' + nr + '</span>' : '')
      + '<input maxlength="1" data-sol="' + ch + '" aria-label="Feld Zeile ' + (r + 1) + ' Spalte ' + (c + 1) + '"></div>';
  }
  gitter.innerHTML = html;
}
function kreuzwortCheck(btn) {
  const box = kreuzwortBox(btn); let ok = 0, total = 0;
  box.querySelectorAll('.kreuzwort-feld input').forEach(inp => {
    total++; const gut = (inp.value || '').toUpperCase() === inp.dataset.sol;
    inp.classList.remove('ok', 'err'); inp.classList.add(gut ? 'ok' : 'err'); if (gut) ok++;
  });
  matchFb(box, ok + ' von ' + total + ' Feldern richtig.', ok === total);
}
function kreuzwortReveal(btn) {
  const box = kreuzwortBox(btn);
  box.querySelectorAll('.kreuzwort-feld input').forEach(inp => {
    inp.value = inp.dataset.sol; inp.classList.remove('err'); inp.classList.add('ok');
  });
}

/* ==== Zugänglichkeit – für jede Seite gleich =========================
   Beschriftung und Eingabefeld einer .field-row verknüpfen, Rückmeldefelder
   als aria-live kennzeichnen, Tooltips, Zuordnungen und Reihenfolgen per Tastatur
   bedienbar machen (DESIGN.md §9).
   ===================================================================== */
function initZugang() {
  let n = 0;
  document.querySelectorAll('.field-row').forEach(row => {
    const lab = row.querySelector('label'), inp = row.querySelector('input,select,textarea');
    if (!lab || !inp || lab.hasAttribute('for')) return;
    if (!inp.id) inp.id = 'feld-' + (++n);
    lab.setAttribute('for', inp.id);
  });
  document.querySelectorAll('.feedback:not([aria-live]),.quiz-fb:not([aria-live])')
    .forEach(el => el.setAttribute('aria-live', 'polite'));
  document.querySelectorAll('.tt:not([tabindex])').forEach(el => el.setAttribute('tabindex', '0'));
  document.querySelectorAll('.match-chip,.match-zone,.reihenfolge-karte').forEach(el => {
    el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });
}

/* ==== Fortschrittsanzeige (freiwillig, seit 13.11.2026) =============
   Nur aktiv, wenn die Seite eine Liste FORTSCHRITT angibt; ohne sie tut
   dieser Abschnitt nichts (ältere Seiten bleiben unverändert).

     const FORTSCHRITT = {
       freiwillig: [5],                       // Phasen, die nicht zur Summe zählen
       aufgaben: [
         { phase: 0, id: 'g-a2', name: 'A2 · Zeilen zählen', hilfe: 'xx-h-a2' },
         { phase: 0, id: 'umweg', name: 'A1 · Partnerfrage' },          // Quiz: qfb-umweg
         { phase: 3, id: 'sort-a6', name: 'A6 c) Einteilung', anker: 'xx-sort-a6' }
       ]
     };

   Je Aufgabe ein Segment im Phasenknopf (#pn{n}), Summe der Pflichtphasen in
   der Titelzeile. Zustände: ok (beim ersten Prüfen richtig, ohne Hilfe),
   teil (nach Fehlversuch, Hilfe oder Auflösung), skip (über einen „Trotzdem …“-
   Knopf in .subphase-lock-hint übergangen, solange offen), offen.
   Nach „Trotzdem zur Musterlösung“ bleibt skip; nach „Trotzdem weiter“ wird
   späteres Lösen zu teil. Kein Speichern.

   Erfasst werden von selbst: checkGroup (Eingabegruppe = id), matchCheck /
   reihenfolgeCheck / fehlersuchePruefen (Container-id = id), Quiz über
   twoStageQuizCheck (id wie in qfb-{id}), showSol mit Präfix aus „hilfe“.
   Eigene Prüfungen der Seite melden sich mit fortschrittGeloest(id, aufAnhieb).
   Segment-Ziel: „anker“, sonst #id, sonst die .quiz-item um #qfb-{id}.

   Im OPAL-iframe klebt die Kopfleiste nicht (SPEZIFIKATION §3); dort steht
   eine flache Leiste am oberen Fensterrand, sobald die Kopfleiste aus dem Bild
   ist. Sie wird in die Elternseite gehängt (gleiche Herkunft, sonst gäbe es
   keinen Rahmen) und dort fixiert: Aus dem iframe heraus nachgeführt würde sie
   beim Scrollen springen, weil Chrome die Elternseite verschiebt, bevor das
   Scroll-Ereignis ankommt. Ihre Regeln kopiert fsElternStil() aus diesem
   Stylesheet; beim Verlassen der Seite (pagehide) wird alles entfernt. Sie
   scrollt nichts. Ihre Höhe (FS_SCHWEBE_HOEHE, in oberstufe.css gleich) rechnet
   scrollToWithNavOffset im iframe zum Rand dazu, damit sie das Ziel nicht
   verdeckt; ohne Fortschrittsanzeige bleibt der Rand 16 px.
   ===================================================================== */
const FS_STAND = {};                 /* id → { zustand, hilfe, endgueltig } */
let FS_LISTE = null;                 /* Seitenliste, null = Anzeige aus */
let FS_SCHWEBE = null;               /* die mitlaufende Leiste, ggf. in der Elternseite */
const FS_SCHWEBE_HOEHE = 42;         /* = height von .fortschritt-schwebe */
const FS_TEXT = { offen: 'offen', ok: 'auf Anhieb richtig', teil: 'nach Versuch oder Hilfe', skip: 'übersprungen' };

function fsPhasen() {
  return Array.from(new Set(FS_LISTE.aufgaben.map(a => a.phase))).sort((a, b) => a - b);
}
function fsFrei(ph) { return (FS_LISTE.freiwillig || []).indexOf(ph) >= 0; }

function fsAnker(a) {
  if (a.anker) return document.getElementById(a.anker);
  const direkt = document.getElementById(a.id);
  if (direkt) return direkt;
  const fb = document.getElementById('qfb-' + a.id);
  return fb ? (fb.closest('.quiz-item') || fb) : null;
}

function fsTeil(a) {
  const el = fsAnker(a), sub = el && el.closest('.subphase');
  return sub ? parseInt(sub.id.split('-sub-')[1], 10) : 1;
}

function fsSetzen(id, zustand) {
  const st = FS_STAND[id]; if (!st) return;
  if (st.zustand === 'ok' || st.zustand === 'teil') return;
  if (st.zustand === 'skip' && st.endgueltig && zustand !== 'skip') return;
  st.zustand = zustand;
  fortschrittZeichnen();
}

/* Aufruf aus Prüffunktionen: Aufgabe gelöst (oder nach Versuchen aufgelöst). */
function fortschrittGeloest(id, aufAnhieb) {
  if (!FS_LISTE) return;
  const st = FS_STAND[id]; if (!st) return;
  fsSetzen(id, aufAnhieb && !st.hilfe && st.zustand === 'offen' ? 'ok' : 'teil');
}

/* Elemente der Seite und der Leiste (die in der Elternseite stehen kann) */
function fsAlle(sel) {
  const hier = Array.from(document.querySelectorAll(sel));
  if (FS_SCHWEBE && FS_SCHWEBE.ownerDocument !== document) hier.push(...FS_SCHWEBE.querySelectorAll(sel));
  return hier;
}

function fortschrittZeichnen() {
  if (!FS_LISTE) return;
  fsAlle('.fortschritt-seg').forEach(sg => {
    const a = FS_LISTE.aufgaben.find(x => x.id === sg.dataset.id); if (!a) return;
    const z = FS_STAND[a.id].zustand;
    sg.dataset.zustand = z;
    sg.title = a.name + ' – ' + FS_TEXT[z] + ' (Klick: zur Aufgabe)';
  });
  fsPhasen().forEach(ph => {
    const liste = FS_LISTE.aufgaben.filter(a => a.phase === ph);
    const fertig = liste.filter(a => FS_STAND[a.id].zustand === 'ok' || FS_STAND[a.id].zustand === 'teil').length;
    const luecke = liste.some(a => FS_STAND[a.id].zustand === 'skip');
    const sektion = document.getElementById('ph' + ph);
    const gruppe = FS_SCHWEBE && FS_SCHWEBE.querySelector('.fortschritt-gruppe[data-phase="' + ph + '"]');
    if (gruppe) gruppe.classList.toggle('fortschritt-hier', !!sektion && sektion.classList.contains('on'));
    const pille = document.getElementById('pn' + ph);
    if (!pille) return;
    pille.classList.toggle('fortschritt-luecke', luecke);
    pille.classList.toggle('fortschritt-fertig', !luecke && fertig === liste.length);
    pille.title = 'Phase ' + ph + (fsFrei(ph) ? ' (freiwillig)' : '') + ': ' + fertig + ' von ' + liste.length
      + ' gelöst' + (luecke ? ', etwas übersprungen' : '');
    const kopf = pille.querySelector('.fortschritt-kopf');
    if (kopf) pille.setAttribute('aria-label', kopf.textContent.replace(/\s+/g, ' ').trim() + ' – ' + pille.title);
  });
  const pflicht = FS_LISTE.aufgaben.filter(a => !fsFrei(a.phase));
  const zahl = z => pflicht.filter(a => FS_STAND[a.id].zustand === z).length;
  fsAlle('.fortschritt-summe').forEach(s => {
    s.innerHTML = (zahl('ok') + zahl('teil')) + '/' + pflicht.length + '<span class="fortschritt-mehr"> gelöst</span>'
      + (zahl('skip') ? ' · ' + zahl('skip') + '<span class="fortschritt-mehr"> übersprungen</span> ⚠' : '');
  });
  fortschrittSchweben();
}

function fortschrittSpringen(id) {
  const a = FS_LISTE && FS_LISTE.aufgaben.find(x => x.id === id); if (!a) return;
  const sektion = document.getElementById('ph' + a.phase);
  if (sektion && !sektion.classList.contains('on')) showPhase(a.phase);
  const ziel = fsAnker(a), sub = ziel && ziel.closest('.subphase');
  /* Gesperrte Aufgaben im Unterrichtsmodus nicht öffnen: zur sichtbaren Sperre davor */
  const sperre = sub && !sub.classList.contains('on') && !document.body.classList.contains('mode-full')
    ? document.querySelector('#ph' + a.phase + ' .subphase-lock-hint:not([style*="none"])') : null;
  setTimeout(() => scrollToWithNavOffset(sperre || ziel), 60);
}

/* Zusatzrand für Sprünge im iframe: nur wenn die Leiste erscheinen kann */
function fsSchwebeReserve() {
  if (!FS_LISTE) return 0;
  return FS_SCHWEBE ? FS_SCHWEBE_HOEHE : 0;
}

/* Kurzname der Phase aus dem Phasenknopf, ohne Nummer */
function fsPhasenName(ph) {
  const pille = document.getElementById('pn' + ph);
  if (!pille) return '';
  const kopie = pille.cloneNode(true);
  kopie.querySelectorAll('.tn-num, .fortschritt-band').forEach(n => n.remove());
  return kopie.textContent.replace(/\s+/g, ' ').trim();
}

function fsBand(ph) {
  return '<span class="fortschritt-band" aria-hidden="true">' + FS_LISTE.aufgaben.filter(a => a.phase === ph)
    .map(a => '<span class="fortschritt-seg" data-id="' + a.id + '"></span>').join('') + '</span>';
}

function fortschrittSchweben() {
  const leiste = FS_SCHWEBE;
  if (!leiste) return;
  const rahmen = elternScrollRahmen();
  const nav = document.querySelector('.top-nav');
  if (!rahmen || !rahmen.isConnected || !nav || leiste.ownerDocument === document) { leiste.classList.remove('fortschritt-zeigen'); return; }
  /* Elternseite: fixiert am Fensterrand, nur Sichtbarkeit und Breite nachführen */
  const r = rahmen.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  const zeigen = -r.top > navRect.bottom - 8 && r.bottom > FS_SCHWEBE_HOEHE + 40;
  leiste.classList.toggle('fortschritt-zeigen', zeigen);
  if (!zeigen) return;
  leiste.style.left = (r.left + rahmen.clientLeft + navRect.left) + 'px';
  leiste.style.width = navRect.width + 'px';
}

/* Regeln der Leiste für die Elternseite: aus diesem Stylesheet kopiert, auf
   [data-fortschritt-eltern] beschränkt, Variablen und Schriften mitgenommen.
   Rückgabe: CSS-Text und die benutzten Variablen. */
function fsElternStil() {
  const passt = /\.fortschritt-(schwebe|gruppe|name|band|seg|summe|mehr|frei|hier|zeigen)\b/;
  const fremd = /tn-pill|tn-title-row|body|fortschritt-kopf/;
  const sel = t => t.split(',').map(x => x.trim()).filter(x => passt.test(x) && !fremd.test(x))
    .map(x => x.indexOf('.fortschritt-schwebe') === 0
      ? x.replace('.fortschritt-schwebe', '.fortschritt-schwebe[data-fortschritt-eltern]')
      : '[data-fortschritt-eltern] ' + x).join(', ');
  let css = '';
  const regeln = (liste, basis) => {
    let teil = '';
    Array.from(liste).forEach(r => {
      if (r.type === 1) { const st = sel(r.selectorText); if (st) teil += st + ' { ' + r.style.cssText + ' }\n'; }
      else if (r.type === 4) { const innen = regeln(r.cssRules, basis); if (innen) teil += '@media ' + r.conditionText + ' {\n' + innen + '}\n'; }
      else if (r.type === 5) teil += r.cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => 'url("' + new URL(u, basis).href + '")') + '\n';
    });
    return teil;
  };
  Array.from(document.styleSheets).forEach(sh => {
    try { css += regeln(sh.cssRules, sh.href || location.href); } catch (e) { /* nicht lesbar */ }
  });
  const variablen = Array.from(new Set((css.match(/var\(--[\w-]+/g) || []).map(v => v.slice(4))));
  return { css, variablen };
}

/* Leiste in die Elternseite hängen; false, wenn das nicht geht */
function fsInElternseite(leiste) {
  let eltern, stil;
  try {
    eltern = window.parent.document;
    const { css, variablen } = fsElternStil();
    if (!css) return false;
    stil = eltern.createElement('style');
    stil.textContent = css;
    eltern.head.appendChild(stil);
    const wurzel = getComputedStyle(document.documentElement);
    eltern.body.appendChild(eltern.adoptNode(leiste));
    variablen.forEach(v => leiste.style.setProperty(v, wurzel.getPropertyValue(v)));
    leiste.setAttribute('data-fortschritt-eltern', '');
    Object.assign(leiste.style, {
      position: 'fixed', top: '0', zIndex: '2147483000', margin: '0',
      fontFamily: getComputedStyle(document.body).fontFamily, lineHeight: '1.2', textAlign: 'left'
    });
  } catch (e) { if (stil) stil.remove(); return false; }
  /* Klicks in der Elternseite: Segment → Aufgabe, Gruppe → Phase */
  leiste.addEventListener('click', ev => {
    const seg = ev.target.closest('.fortschritt-seg');
    if (seg) { ev.preventDefault(); fortschrittSpringen(seg.dataset.id); return; }
    const gruppe = ev.target.closest('.fortschritt-gruppe');
    if (gruppe) showPhase(parseInt(gruppe.dataset.phase, 10));
  });
  const ew = window.parent;
  ew.addEventListener('scroll', fortschrittSchweben, { passive: true });
  ew.addEventListener('resize', fortschrittSchweben);
  /* Seite verlassen oder iframe entfernt: nichts in OPAL zurücklassen */
  window.addEventListener('pagehide', () => {
    try {
      ew.removeEventListener('scroll', fortschrittSchweben);
      ew.removeEventListener('resize', fortschrittSchweben);
    } catch (e) { /* Elternseite schon weg */ }
    leiste.remove(); stil.remove();
  });
  return true;
}

function fortschrittInit() {
  const liste = seitenwert('FORTSCHRITT');
  if (!liste || !Array.isArray(liste.aufgaben) || !liste.aufgaben.length) return;
  FS_LISTE = liste;
  liste.aufgaben.forEach(a => { FS_STAND[a.id] = { zustand: 'offen', hilfe: false, endgueltig: false }; });
  /* Band in jeden Phasenknopf: Name und Nummer oben, Segmente darunter */
  fsPhasen().forEach(ph => {
    const pille = document.getElementById('pn' + ph);
    if (!pille) return;
    const kopf = document.createElement('span');
    kopf.className = 'fortschritt-kopf';
    Array.from(pille.childNodes).forEach(n => kopf.appendChild(n));
    pille.appendChild(kopf);
    pille.insertAdjacentHTML('beforeend', fsBand(ph));
    pille.classList.add('fortschritt-pill');
    if (fsFrei(ph)) pille.classList.add('fortschritt-frei');
  });
  /* Summe in der Titelzeile vor den Ansichtsknöpfen */
  const modus = document.querySelector('.tn-title-row .mode-toggle');
  if (modus) {
    const summe = document.createElement('span');
    summe.className = 'fortschritt-summe';
    summe.title = 'Pflichtaufgaben' + ((liste.freiwillig || []).length ? ' ohne freiwillige Phasen' : '')
      + '. Was außerhalb der Seite erledigt wird (Excel, Hefter), zählt nicht.';
    modus.parentElement.insertBefore(summe, modus);
  }
  /* Mitlaufende Leiste für den OPAL-iframe */
  const schwebe = document.createElement('div');
  schwebe.className = 'fortschritt-schwebe';
  schwebe.innerHTML = fsPhasen().map(ph => {
    const name = fsPhasenName(ph);
    return '<span class="fortschritt-gruppe' + (fsFrei(ph) ? ' fortschritt-frei' : '')
      + '" data-phase="' + ph + '" title="Phase ' + ph + (name ? ': ' + name : '') + '">'
      + '<span class="fortschritt-name"><b>' + ph + '</b> ' + name + '</span>' + fsBand(ph) + '</span>';
  }).join('')
    + '<span class="fortschritt-summe"></span>';
  (document.querySelector('.wrap') || document.body).appendChild(schwebe);
  FS_SCHWEBE = schwebe;
  /* Nur im OPAL-iframe sichtbar, dann in der Elternseite; sonst bleibt sie verborgen */
  if (elternScrollRahmen() && !fsInElternseite(schwebe)) {
    FS_SCHWEBE = null;
    schwebe.remove();
  }
  /* Klicks: Segment → Aufgabe (auch im Phasenknopf, ohne dessen Phasenwechsel); Gruppe → Phase */
  document.addEventListener('click', ev => {
    const seg = ev.target.closest && ev.target.closest('.fortschritt-seg');
    if (seg) { ev.preventDefault(); ev.stopPropagation(); fortschrittSpringen(seg.dataset.id); return; }
    const gruppe = ev.target.closest && ev.target.closest('.fortschritt-gruppe');
    if (gruppe) showPhase(parseInt(gruppe.dataset.phase, 10));
  }, true);
  /* „Trotzdem …“ in einer Sperre: offene Aufgaben davor gelten als übersprungen */
  document.addEventListener('click', ev => {
    const knopf = ev.target.closest && ev.target.closest('.subphase-lock-hint button');
    if (!knopf) return;
    const m = (knopf.getAttribute('onclick') || '').match(/revealSub\((\d+),\s*(\d+)\)/);
    if (!m) return;
    const ph = +m[1], teil = +m[2], muster = /Musterlösung/.test(knopf.textContent);
    liste.aufgaben.forEach(a => {
      if (a.phase !== ph || fsTeil(a) >= teil || FS_STAND[a.id].zustand !== 'offen') return;
      FS_STAND[a.id].endgueltig = muster;
      fsSetzen(a.id, 'skip');
    });
  }, true);
  /* Quiz und Hilfen aus engine.js nur bei aktiver Anzeige umhüllen */
  if (typeof twoStageQuizCheck === 'function') {
    const quiz = twoStageQuizCheck;
    window.twoStageQuizCheck = function (id, el, verdict, fbMap) {
      const opts = el && el.parentElement;
      const vorher = opts ? parseInt(opts.dataset.wrongAttempts || '0', 10) : 0;
      const erg = quiz.apply(this, arguments);
      const nachher = opts ? parseInt(opts.dataset.wrongAttempts || '0', 10) : 0;
      if (verdict === 'c' || verdict === 'correct') fortschrittGeloest(id, vorher === 0);
      else if (nachher >= 2) fortschrittGeloest(id, false);
      return erg;
    };
  }
  if (typeof showSol === 'function') {
    const loesung = showSol;
    window.showSol = function (id) {
      const erg = loesung.apply(this, arguments);
      liste.aufgaben.forEach(a => {
        if (a.hilfe && (String(id) === a.hilfe || String(id).indexOf(a.hilfe + '-') === 0) && FS_STAND[a.id].zustand === 'offen') FS_STAND[a.id].hilfe = true;
      });
      return erg;
    };
  }
  window.addEventListener('resize', fortschrittSchweben);
  if (typeof ResizeObserver === 'function') new ResizeObserver(fortschrittSchweben).observe(document.body);
  fortschrittZeichnen();
}

/* ==== Start =========================================================
   Unterrichtsmodus, erste Phase offen. Werkzeuge in noch verborgenen
   Schritten werden erst beim Aufdecken initialisiert — die Seite ruft
   ihre eigenen Init-Funktionen dafuer selbst auf.
   ===================================================================== */
document.addEventListener('DOMContentLoaded', function () {
  setViewMode(false);
  initSubReveal();
  if (!document.querySelector('.phase.on')) {
    const erste = document.querySelector('.phase');
    if (erste) {
      erste.classList.add('on');
      const knopf = document.getElementById('pn' + erste.id.replace('ph', ''));
      if (knopf) knopf.classList.add('active');
    }
  }
  document.querySelectorAll('.chat-window').forEach(w => {
    if (typeof chatInit === 'function') chatInit(w.id.replace('chat-', ''));
  });
  document.querySelectorAll('.match').forEach(matchMischen);
  document.querySelectorAll('.reihenfolge').forEach(reihenfolgeMischen);
  document.querySelectorAll('.parsons').forEach(parsonsInit);
  document.querySelectorAll('.kreuzwort').forEach(kreuzwortBuild);
  document.querySelectorAll('.tabellenvorschau[data-quelle]').forEach(tabellenvorschauZeichnen);
  document.querySelectorAll('.klickstrecke').forEach(klickstreckeInit);
  document.querySelectorAll('.struktogramm-zeichnen').forEach(struktogrammZeichnenInit);
  initZugang();
  fortschrittInit();
});
