/* =====================================================================
   Gemeinsame Engine für alle LernHTML — Klasse 5 bis 12
   ---------------------------------------------------------------------
   ERZEUGT, NICHT VON HAND ÄNDERN in den HTML-Dateien.
   Diese Datei ist die Quelle; build.py trägt die Blöcke in die Seiten ein.
   Änderungen hier wirken nach dem nächsten Bauen auf alle Seiten.

   Namensschema für Bausteine: <präfix><Verb>
     Verben:  Init · Select · Place · Check · Reset · Reveal
     Präfixe: match (Begriff↔Definition) · bucket (Chips→Zonen)
              sort (Reihenfolge) · cloze (Lückentext) · flash (Karteikarten)
              cw (Kreuzworträtsel) · ws (Wortsuche) · mark (Wörter markieren)
              mem (Memory) · tl (Zeitstrahl)
   ===================================================================== */

/* ==== BLOCK: quiz ====================================================
   Zweistufiges Quiz — verbindlich für alle Multiple-Choice-Fragen.

   Ablauf
     1. Fehlversuch  → gelber, lösungsfreier Tipp (hint).
                       Nur die gewählte Option wird gesperrt,
                       ein zweiter Versuch bleibt offen.
     2. Fehlversuch  → auflösendes Feedback (ng), alle Optionen gesperrt,
        oder richtig    die richtige Antwort wird grün markiert.

   Markup
     <div class="quiz-item">
       <div class="quiz-q">Frage?</div>
       <div class="quiz-opts">
         <button class="quiz-btn" onclick="themaQuizCheck('id', this, 'c')">richtig</button>
         <button class="quiz-btn" onclick="themaQuizCheck('id', this, 'w')">falsch</button>
       </div>
       <div class="quiz-fb" id="qfb-id" aria-live="polite"></div>
     </div>

   Je Themenblock ein Feedback-Objekt und ein dünner Wrapper:
     const themaQuizFeedback = { 'id': { ok:'…', ng:'…', hint:'…' } };
     function themaQuizCheck(id, el, verdict) {
       twoStageQuizCheck(id, el, verdict, themaQuizFeedback);
     }

   JEDE Frage braucht alle drei Felder. Der hint verrät die Lösung NICHT.
   Klassen: .quiz-btn + .correct / .wrong / .tryagain
            .quiz-fb  + .ok / .ng / .hint
   ===================================================================== */
function twoStageQuizCheck(id, el, verdict, fbMap) {
  const fb = document.getElementById('qfb-' + id);
  const opts = el.parentElement;
  const btns = opts.querySelectorAll('.quiz-btn');
  const data = fbMap ? fbMap[id] : null;
  const isCorrect = (verdict === 'c' || verdict === 'correct');

  if (isCorrect) {
    el.classList.remove('tryagain');
    el.classList.add('correct');
    btns.forEach(b => b.disabled = true);
    if (fb) {
      fb.innerHTML = (data && data.ok) ? data.ok : '✅ <strong>Richtig!</strong>';
      fb.className = 'quiz-fb ok';
    }
    return;
  }

  const wrong = (parseInt(opts.dataset.wrongAttempts || '0', 10)) + 1;
  opts.dataset.wrongAttempts = wrong;
  el.disabled = true;                       // nur die gewählte Option sperren

  if (wrong === 1) {                        // Stufe 1 — Tipp, zweiter Versuch bleibt
    el.classList.add('tryagain');
    const hint = (data && data.hint)
      ? data.hint
      : 'Überdenke deine Wahl und schließe offensichtlich falsche Optionen aus.';
    if (fb) {
      fb.innerHTML = '💡 <strong>Tipp:</strong> ' + hint +
                     ' <em>Du hast noch einen Versuch.</em>';
      fb.className = 'quiz-fb hint';
    }
  } else {                                  // Stufe 2 — Auflösung, richtige Option grün
    el.classList.remove('tryagain');
    el.classList.add('wrong');
    btns.forEach(b => {
      b.disabled = true;
      const oc = b.getAttribute('onclick') || '';
      if (/,\s*this\s*,\s*'(c|correct)'\s*\)/.test(oc)) {
        b.classList.remove('tryagain');
        b.classList.add('correct');
      }
    });
    if (fb) {
      fb.innerHTML = (data && data.ng)
        ? data.ng
        : '❌ Nicht ganz — die richtige Antwort ist grün markiert.';
      fb.className = 'quiz-fb ng';
    }
  }
}

/* Zurücksetzen einer einzelnen Frage (optional, z. B. für Wiederholungsrunden) */
function quizReset(id) {
  const fb = document.getElementById('qfb-' + id);
  if (!fb) return;
  const opts = fb.previousElementSibling;
  if (!opts) return;
  delete opts.dataset.wrongAttempts;
  opts.querySelectorAll('.quiz-btn').forEach(b => {
    b.disabled = false;
    b.classList.remove('correct', 'wrong', 'tryagain');
  });
  fb.innerHTML = '';
  fb.className = 'quiz-fb';
}
/* ==== END: quiz ==================================================== */

/* ==== BLOCK: hints ====================================================
   Gestufte Hilfen — verbindliches Muster für Hilfe-Buttons, die schrittweise
   mehr verraten. Aufdecken ist einseitig (kein Zuklappen) und OHNE
   Persistenz: Ob ein per OPAL eingebettetes iframe localStorage überhaupt
   zulässt, ist ungeklärt; die einfache Variante läuft überall zuverlässig
   und passt zum Stand aller anderen Referenzdateien.

   Markup
     <button class="btn btn-ghost btn-sm" onclick="showSol('thema-h1')">💡 Hilfe 1 · Titel</button>
     <div class="tool-hidden" id="thema-h1">
       <div class="callout"><span><strong>Titel:</strong> Text.</span></div>
     </div>

   CSS (fest, siehe SPEZIFIKATION.md Abschnitt 6a):
     .tool-hidden { display: none; margin-top: 10px; }
     @media print { .tool-hidden { display: block !important; } }

   AUSNAHME: KL11LB1_01_ZahlensystemeZeichenkodierung.html dient hierfür
   NICHT als Vorlage. Dort löst showSol() eine seitenweite Autosave-Funktion
   (saveLearningState/restoreLearningState) aus, die den gesamten Lernstand
   der Seite sichert (Eingaben, Quizfortschritt, Zuordnungen, LED-Zustände —
   die Hilfen-Sichtbarkeit ist dort nur ein Nebeneffekt unter vielen). Das
   ist ein eigenständiges, unabhängiges Feature dieser einen Datei, kein
   Beispiel für das Hilfen-Muster.
   ===================================================================== */
function showSol(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}
/* ==== END: hints ==================================================== */
