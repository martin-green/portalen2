# Portalen 2 – plan

Levande plan att iterera på. Bocka av, stryk eller lägg till punkter.

## Vision

Portalen blir ett helskärms webbspel i snedperspektiv (2,5D, "slant 3D") med en enkel
strategidel. Kartan bygger på satellitbilden av Härsjösand. Kärnan är densamma som 1997:
öppna portalen för sugbilen och håll den stängd för sopbilen. Runt omkring finns nu fler
sysslor på lägergården som konkurrerar om spelarens uppmärksamhet och om några få funktionärer.

- Tre liv, ritade som tält precis som i originalet.
- När sista livet är slut svämmar allt över med bajs från trekammarbrunnen, med prutt-ljud.
- Dag/natt-cykel. Svårigheten ökar för varje dag.
- Allt renderas i kod med Three.js (WebGL2). Inga bildfiler behövs. Körs via lokal server (`npm start`) eller GitHub Pages.

## Karta (från härsjösand-satellitbild1.png)

Skala: 10 px i satellitbilden = 1 m. Världskoordinater i meter: x = österut, z = söderut.

| Plats | Satellit px | Värld (m) | Källa |
|---|---|---|---|
| Portalen (vit oval) | 1545, 1319 | 154.5, 132 | markerad |
| Trekammarbrunnen (röd cirkel) | 1355, 525 | 135.5, 52.5 | markerad |
| Flaggstången (blå cirkel) | 1680, 690 | 168, 69 | markerad |
| Bastun (orange cirkel) | 2145, 1160 | 207, 116 (grått plåttak, nock öst–väst, satellitbild 3 och 4) | markerad |
| Ved (vedboden, blå oval, långt vitt tak) | 1250–1300, 150–285 | 127, 21.5 | markerad + karta |
| Verktygsboden | 1263–1374, 330–433 | 132, 38 | karta |
| Ladan (sugbilen parkerar väster om den) | 1280–1490, 530–660 | 139, 59 | karta |
| Lillstugan | 1650–1790, 385–490 | 172, 48.5 | karta |
| Storstugan | – | 165.2, 100 (huvudkropp öst–väst, tvärgavel i nordväst, tillbyggnad i söder) | satellitbild 4 |
| Garaget | 1378–1472, 1200–1305 | 142.8, 125.2 (nock nord–syd, vridet ca 10°, portar mot öster) | karta + satellitbild 1 och 4 |
| Stenmurar (norr om garaget) | 1024–1460, 1092–1180 | väster om vägen 102–146, 110–119; öster om vägen 151.6–159.5, 108.7 | satellitbild 1 |
| Byggnaden med gult tak söder om garaget | – | tillfällig container, finns inte med i spelet | svar |
| Boktjärn | – | väster om kartan, östra stranden x ≈ −5 | hsandkarta.png (0,3 m/px, Ladan som fixpunkt) |
| Kanotförrådet | 2145–2260, 540–700 | 220, 62 | svar |
| Soptunnorna (sydost om portalen) | – | 160, 136.5 | svar |
| Utedasset (rosa cirkel i satellitbild2) | 1436–1512, 353–429 | 149.7, 37.75 (dassbyggnaden, dörrar mot väster) | markerad |
| Stora Härsjön | öster | strandlinje x ≈ 220–285 | tolkad |

## Spelmekanik

### Kärnan: portalen
- Utseende enligt hsandvinter.jpg: två röda plankpelare med vita knutar och ett sadeltak med vita vindskivor, röd gavel och den orange skylten "Härsjösand". De vita grindarna står uppställda. Hela taket lyfter med ett gångjärn i toppen av den östra (högra) pelaren.
- Klicka på portalen, tryck mellanslag eller ↑/↓ för att öppna eller stänga. Taket fälls upp på cirka 2 s.
- **Sugbilen** måste släppas in. Den kör till trekammarbrunnen, pumpar och kör sedan ut igen.
  - Om portalen är stängd när den kommer fram kraschar den och du förlorar ett liv.
  - Om portalen håller på att öppnas väntar den.
  - Den tutar när den närmar sig och när den är klar och vill ut.
- **Sopbilen** tömmer soptunnorna utanför portalen, vänder och kör iväg.
  - Om portalen är öppen kör den in på gräsmattan och lämnar hjulspår. Du förlorar ett liv.
  - Om du öppnar portalen medan den tömmer kör den också in.
- Fordonen köar. Sugbilen väntar innanför om sopbilen står vid grinden.
- Du kan **ringa sugbilen** när brunnen börjar bli full. Den kommer efter 1–2 speltimmar.

### Sysslor på lägergården
| Syssla | Mekanik | Misslyckande |
|---|---|---|
| Trekammarbrunnen | Nivån stiger under dagen. Sugbilen tömmer. | Översvämning vid 100 % kostar ett liv. |
| Utedasset | Fylls på. En funktionär bär tunnan till brunnen (som då fylls på mer). | Fullt dass sänker stämningen. |
| Flaggan | Hissas 08:00 (senast 09:00). Halas senast 21:00. | Sänker stämningen. |
| Vedboden | En funktionär hugger ved (max 30). | Ingen ved till bastun. |
| Bastun | Kör ved med skottkärra och elda från cirka 18:00 så att bastun är varm (≥ 65 °C) till kvällsdoppet 21:00. Resan från vedboden tar en bra stund. | Scouterna blir blåa av kylan. Stor stämningsförlust. |
| Gräsmattan | Gräset växer. Den röda åkgräsklipparen startar bara ibland: klicka för att dra i startsnöret. Den kan också tjuvstanna. | För långt gräs gör att skottkärran fastnar, så det blir ingen ved till bastun. Det sänker också stämningen. |

### Fordonstrafik
- Bara ett fordon i taget på vägen. Nästa kommer tidigast 6 s efter att det förra lämnat kartan, så att man hinner stänga portalen efter sugbilen.
- Dagens schema körs i tidsordning. Ett besök som blivit mer än 1,5 timme försenat stryks.

### Detaljvy för husen
- Klicka på ett hus (även bastun, vedboden och dasset) för att få en panel med beskrivning, planskiss, mått och läget just nu. Kameran flyger dit och kretsar runt huset. Spelet pausas så länge panelen är öppen.
- Texterna står i `js/world.js` (`info` på varje hus) och kan redigeras där.

### Resurser och strategi
- **Funktionärer:** Olle, Stina och Kim. Från dag 3 kommer även Ali. Varje syssla kräver att någon går dit. Spelaren väljer vad som prioriteras.
- **Stämning (0–100):** påverkas av sysslorna. Vid 0 förlorar du ett liv och stämningen återställs till 40.
- **Poäng:** sugbilsbesök +10, avvisad sopbil +5, varm bastu +20, flagga i tid +5 och dagsbonus 25 × dag.
- **Highscore:** sparas lokalt (localStorage) med namn.

### Dygnet
- 07:00 morgon → 08:00 flagga → dagtrafik → 18:00 elda bastun → 20–21 hala flaggan → 21:00 kvällsdopp → 22:30 läggdags.
- 1 sekund = 3 spelminuter (en dag ≈ 5 minuter). Natten snabbspolas 14 gånger fortare. Brunn, dass och gräs fortsätter att utvecklas under tiden.

## Grafik (Three.js)
- Perspektivkamera som kan panoreras, roteras, lutas och zoomas (mus, hjul, tangentbord, touch med nyp/vrid).
- Low-poly-hus byggda i kod, med fönster, dörrar och knutar. Fönstren lyser på kvällen.
- Solen rör sig över himlen. Skuggkartan följer kameran, och flaggstångens skugga pekar norrut mitt på dagen.
- Instansierad granskog (cirka 2 000 träd på kartan och 3 700 i fjärran), björkar och tallar.
- Gräsmattan är en dynamisk textur med klippta ränder. Långt gräs visas som 3D-tuvor.
- Sjön har en egen vattenshader med vågor och solglitter. Himlen har gradient, sol och stjärnor.
- Lyktstolpar, bastuglöd och strålkastare på fordonen (punkt- och spotljus). Partiklar för rök, gnistor, flis, gräsklipp, plask och bajs.
- HUD i HTML/CSS: uppgiftskort, markörer i världen som följer objekten (och visar pilar vid kanten när de är utanför bild), funktionärslista och notiser.

## Ljud
Nya syntljud via WebAudio: tutor, krasch, pump, prutt, yxhugg, motor, startförsök, sprak, plask, fåglar. Kan stängas av med M.

## Teknik
- ES-moduler med en import map: `three` pekar på `vendor/three/three.module.js` (r187, incheckad). Ingen CDN och inget byggsteg.
- Lokalt: `npm start` (startar `server.mjs`) och öppna http://localhost:21046 (annan port: `PORT=1234 npm start`). Från `file://` fungerar det inte, eftersom webbläsare blockerar moduler där.
- Publicering: GitHub Pages från `master` / root på https://martin-green.github.io/portalen2/. Filen `.nojekyll` finns. I repots inställningar (Settings → Pages) ska källan vara "Deploy from a branch", `master`, `/ (root)`. Den gamla `gh-pages`-grenen är en autogenererad projektsida och används inte.
- Referensbilder (satellitbilder, kartor, foton) ligger i `references/`, som är undantagen i `.gitignore`.
- Uppdatera three.js: `npm install three@latest` och sedan `npm run vendor`.
- Moduler (delar namnrymden `PG`):
  - `util.js`, `audio.js` (syntljud), `world.js` (karta, träd, A*), `ground.js` (marktexturer, gräsrutnät, spår)
  - `mesh.js` (ytbyggare och dygnsljus), `gfx.js` (Three.js-scen, kamera, ljus, vatten, skog, partiklar, figurer)
  - `objects.js` (byggnader, portal, flagga med mera), `actors.js` (funktionärer, scouter, fordon, klippare)
  - `game.js` (regler), `ui.js` (HUD och kontroller), `main.js` (start och loop)
- Originalet från 1997/2015 (gamla `index.html`, `portalen.js`, gif- och ljudfiler) är borttaget men finns kvar i git-historiken.

## Faser
- [x] 0. Analys av original och kartor, plan
- [x] 1. Motor: Three.js-scen, kamera, ljus, mark, sjö, skog
- [x] 2. Karta: hus, väg, sjö, portal, flaggstång, brunn, dass, vedbod, bastu, brygga
- [x] 3. Kärnspel: portal, sugbil, sopbil, liv, poäng, game over-översvämning
- [x] 4. Sysslor: brunn, dass, flagga, ved, bastu, gräs och klippare, funktionärer med vägfinning
- [x] 5. Dygn, stämning, scouter (kvällsdopp), svårighet per dag
- [x] 6. HUD, start-/paus-/game over-skärm, highscore, touch
- [x] 7. Ljud (syntljud)
- [ ] 8. Finputs: balans, prestanda på svagare datorer och mobiler, fler animationer

## Nästa steg och idéer
- Speltesta och balansera: trafik per dag, fyllnadstakt i brunn och dass, grästillväxt, bastuns uppvärmning.
- Kort introduktion eller handledning första dagen (pilar som visar portalen, flaggan och bastun).
- Vinter som årstid: snö på marken och taken, skotta vägen i stället för att klippa, frusen sjö och vak vid bastun.
- Väder: regn ger snabbare grästillväxt, dimma på morgonen.
- Fler fordon: mjölkbil, föräldrar som hämtar och lämnar, brandbil vid övning.
- Välja själv vilken funktionär som gör en syssla (klicka på personen och sedan på uppgiften).
- Bloom/efterbehandling för kvällsljuset. Kvalitetsinställning (skuggor och antal träd) för mobiler.
- Ljud: fler variationer, musik i menyn.

## Öppna frågor
1. Var ligger vedboden och utedasset egentligen? Vad är den lilla blå markeringen vid huset i norr (ca 1300, 300 px)?
    - Svar: Se nya markeringar på satellitbilden: Vedbod är hused som heter "Ved" på kartan, inringat blå oval på satellitbild. Rosa cirkel är utedass.

2. Vad heter husen? Just nu används arbetsnamn som Huvudbyggnaden, Norra stugan och Sjöstugan.
    - Svar: Se namn på kartan: C:\src\portalen2\hsandkarta.png. Namnen står under husen.

3. Var står soptunnorna? Antagande: utanför portalen vid vägen.
    - Svar: Ja, nära portalen, syd öster om portalen.

4. Var parkerar sugbilen vid brunnen? Antagande: väster om huvudbyggnaden, med slang till brunnen.
    - Svar: Ja

5. Ska dasstunnan tömmas i trekammarbrunnen, som nu, eller någon annanstans?
    - Svar: Ja

6. Ska portalen kräva en funktionär på plats, eller styras direkt som nu?
    - Svar: Låt den vara direktstyrd, tills vidare.

7. Vintervarianten (hsandvinter.jpg): snö, skotta istället för att klippa? Kan bli en senare "årstid".
    - Svar: ja skotta snö blir aktuellt på vintern.

Svaren på fråga 1–6 är inarbetade. Nya frågor:

8. Heter huset vid sjön (kallas nu Sjöstugan) något? Och de små husen: Uthuset söder om Storstugan, Garageboden norr om Garaget och Boden öster om vägen vid portalen?
    - Svar: Sjöstugan heter Kanotförrådet. Boden är en 20-fots container och är borttagen ur spelet. Utseende efter foton: ladan.webp, lillstugan.webp, storstugan.webp och portalen.webp.
9. Satellitbilderna och kartorna är troligen upphovsrättsskyddade (Google, Lantmäteriet eller liknande). Spelet behöver dem inte. Ska de tas bort från repot innan det publiceras?
    - Svar: Alla referensbilder är flyttade till `references/` och undantagna i `.gitignore`.
10. Känns tempot rätt? En dag är nu cirka 5 minuter.
