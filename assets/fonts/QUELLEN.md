# Lokale Schriften

Die zwei WOFF2-Dateien stammen aus den jeweiligen Paketen von
[@fontsource-variable](https://fontsource.org/docs/getting-started/variable) und
werden lokal mit der gemeinsamen Basis ausgeliefert. Es gibt keine Anfrage an
einen Schriftdienst im Internet.

Schriftkonzept seit 20.09.2026 (`SPEZIFIKATION.md` §1): **JetBrains Mono** für
Code, **STIX Two Math** für `.lesson-math`; Fließtext und Überschriften
verwenden die Systemschriften Arial/Verdana. DM Sans und Bricolage Grotesque
wurden am 22.09.2026 aus diesem Ordner entfernt; noch nicht migrierte Seiten
erhalten sie weiterhin über `_shared/fonts/` und `_shared/fonts.css`.

Beide Schriftfamilien stehen unter der **SIL Open Font License 1.1**. Der
vollständige Lizenztext liegt daneben in `OFL-1.1.txt`.

| Familie | Datei | Offizielle Projektquelle |
|---|---|---|
| JetBrains Mono | `jetbrains-mono-latin-wght-normal.woff2` | <https://github.com/JetBrains/JetBrainsMono> |
| STIX Two Math | `stix-two-math-latin-400-normal.woff2` | <https://github.com/stipub/stixfonts> |

Copyrightangaben der Projekte: © 2020 The JetBrains Mono Project Authors,
© 2001–2021 The STIX Fonts Project Authors. Die offiziellen Projektquellen
bleiben für etwaige Reserved Font Names maßgeblich.

## Prüfsummen der ausgelieferten Dateien (SHA-256)

```text
18be452724bfdc236c074ca94a249a7f41a86752c7d04ab258ce9ed5651f6a7e  jetbrains-mono-latin-wght-normal.woff2
8b2a6834cfe1f4e0f3724ffa59fe92000013fc5a4c41e6a3f438006c26c60f0d  stix-two-math-latin-400-normal.woff2
```

Beim Austausch einer Schrift muss die Quelle erneut geprüft und diese Datei
aktualisiert werden.
