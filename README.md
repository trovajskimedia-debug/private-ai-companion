# PrivateCompanion AI · version 0.2

Privat, lokal AI-följeslagarapp med **Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma 6 och SQLite**. Detta bygger vidare på version 1 i samma repo och gren: `codex/privatecompanion-v1`.

**Windows med ComfyUI Desktop och RTX 3060:** följ [hela steg-för-steg-guiden](docs/WINDOWS.md). Den täcker säker uppdatering från Git/ZIP, databasuppgradering, Z-Image-Turbo, modellfiler, API-export och felsökning.

## Start

Node.js 24 LTS rekommenderas (appens runtime kräver Node.js 22+). Använd den befintliga projektmappen och behåll din `.env`, databas och bilder.

```sh
npm ci
npm run db:deploy
npm run dev
```

För en ny installation: kopiera `.env.example` till `.env` om filen inte redan finns. På Windows används `npm.cmd` i PowerShell:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run db:deploy
npm.cmd run dev
```

Öppna `http://127.0.0.1:3000` på samma dator. Första besöket skapar en egen lösenfras på minst 12 tecken och tre redigerbara vuxna karaktärer. Befintlig lösenfras och data bevaras av migreringen. Stoppa med Ctrl+C. Produktionsläge: `npm run build`, sedan `npm start`.

## Funktioner

- Detaljerade, beständiga profiler: identitet, pronomen, kulturell bakgrund, språk, yrke, fri personlighet, livshistoria, privata detaljer, relation och konversationsstil. Full character description kan skrivas fritt.
- Vän, partner, make/maka, kollega, mentor, familjemedlem, kreativ partner och egen roll. Alla karaktärer är fiktiva vuxna (18+). Familjeroller har strikt icke-sexuella instruktioner och serverkontroller.
- Höjd, kroppsbyggnad, kurvor, bröst, midja, höfter, rumpa, hud, hår, ögon, ansikte, smink, miljö och fri Detailed appearance description. Yoga pants/leggings, vardagskläder, klänning och egna klädfärger.
- Generate realistic preview köar ett riktigt ComfyUI-API-jobb. Den lokalt sparade bilden blir huvudbild för rätt karaktär. En märkt illustration används tills en bild har genererats. Utseendeändringar kräver en ny generering.
- ComfyUI-inställningar i gränssnittet: serveradress, importerat API-workflow, faktiska fältbindningar, modeller och bildstorlek. Test mot serverns `/object_info` upptäcker saknade modeller/noder. Inga nod-ID:n antas i integrationskoden.
- Officiellt härledd Z-Image-Turbo-API-mall och originalgraf för Desktop. [Källa och licens](workflows/SOURCE.md). Ingen modell eller modellvikt laddas ner automatiskt.
- Privata referensbilder och transport till en konfigurerad bildinput i eget referenskompatibelt workflow. Text-till-bild-mallen garanterar inte identitetsbevarande; LoRA-/identitetsflöden kan importeras separat.
- Sparad prompt, seed, faktisk inskickad graf och andra genereringsmetadata. Galleri, förstoring och val av huvudporträtt.
- Privat, sparad Ollama-chatt med aktuell karaktärsprofil och de senaste 40 textmeddelandena som separat kontext. Chattmeddelanden skriver inte om den lagrade profilen. Ingen separat automatisk långtidssammanfattning ingår.
- Bildförfrågningar direkt i chatten, exempelvis ”Skicka en bild på dig i svarta leggings”. Bilden sparas i samma karaktärs galleri. Bildigenkänningen kan stängas av i chatten.
- Relationspoäng, profilsparning, JSON-export och lösenordsskydd finns kvar. JSON-exporten innehåller metadata och meddelanden, men inte bildfilerna.

## Lokala AI-tjänster

**Ollama:** installera och starta separat och hämta en modell, exempelvis `ollama pull llama3.2:3b`. Sätt `OLLAMA_BASE_URL` och `OLLAMA_MODEL` i `.env`, starta om appen och välj Ollama i chatten. Demo-läget använder tydligt märkta förskrivna svar och behöver ingen AI-tjänst.

**ComfyUI:** öppna Settings & integrations, ange adressen som Desktop faktiskt visar (ofta port 8000), ladda den officiella Z-Image-Turbo-mallen eller importera ditt eget fungerande API-workflow, testa och spara. UI-inställningar sparas i SQLite och gäller utan omstart. När ingen UI-konfiguration har sparats kan `COMFYUI_BASE_URL` och `COMFYUI_WORKFLOW_PATH` användas som initiala värden. En gammal `COMFYUI_CHECKPOINT` väljer inte längre automatiskt ett generiskt Stable Diffusion-workflow.

Standardmallen kommer från en fixerad Comfy-Org-källversion och använder separata UNET-, CLIP- och VAE-laddare, AuraFlow-sampling, 8 steg, CFG 1 och res_multistep/simple. Appens startstorlek 512×768 minskar minnesbehovet jämfört med originalmallens 1024×1024. Följ [Windows-guiden](docs/WINDOWS.md) för de tre modellfilerna och för att först prova mallen i Desktop.

Referensbilder måste kopplas till ett kompatibelt identitets-/referensflöde. Enbart prompt och seed lovar inte samma ansikte mellan bilder. API-validering och protokolltester är inte bevis på verklig GPU-körning eller bildkvalitet.

## Data och integritet

Appen lyssnar på loopback som standard. ComfyUI/Ollama har lokala standardadresser. Inga molntjänster krävs för appens funktioner och ingen analystjänst används. Next.js-telemetri stängs av av start-/byggskripten innan Next initieras. Paket- och modellinstallation kräver förstås nedladdning när de inte redan finns.

Detta är en lösenordsskyddad **single-owner-app för en serverprocess**. Scrypt-hashade lösenfraser, hashade sessions-ID:n, HTTP-only-cookie, inloggningsbegränsning och skydd mot cross-site skrivningar används. Slutför första lösenfrasen innan du exponerar appen för andra. För HTTPS bakom en betrodd reverseproxy: bevara Host och sätt `COOKIE_SECURE=true`.

SQLite, bilder, referenser och backuper är **inte krypterade på disk**. Skydda filsystemet och dina säkerhetskopior. Anslutna lokala AI-tjänster tar emot de uppgifter som krävs för bearbetningen. Hemligheter/private details ingår i Ollama-profilen, men inte i bildprompten.

Standarddatabasen är `prisma/dev.db`; genererade bilder och referenser finns i `data/images`. Relativa SQLite-sökvägar i DATABASE_URL räknas från `prisma/`. Stoppa appen och säkerhetskopiera databasen och hela data-mappen tillsammans. `.env`, databaser, bilder och testutdata är Git-ignorerade.

`db:deploy` skapar en saknad SQLite-fil utan att ersätta en befintlig fil och tillämpar versionshanterade migreringar. Uppgraderingen från version 1 lägger till fält och tabeller utan att radera befintliga profiler, samtal eller relationspoäng. Använd inte `prisma migrate reset` för uppdatering.

Chattradering tar bort chattens bildfiler, men behåller separata porträtt. Att välja en galleribild som porträtt skyddar den från chattradering och flyttar den från chatthistoriken till porträttsamlingen. Karaktärsradering raderar också dess referenser och bildfiler. Separata säkerhetskopior och ComfyUI:s egen output-/input-katalog påverkas inte av radering i appen.

## Verifiering

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run test:integrations
npm run format:check
```

Enhetstester täcker validering, familjeroller, profilkontext, importerade grafer, saknade modeller, promptdata, autentisering och en uppgradering av en befolkad version-1-databas. Chromium-tester täcker grundflödet och mobilvy. HTTP-integrationstester täcker Ollama, ComfyUI-kö/historik, återupptagna jobb, profiler/porträtt/galleri, fel, bildförfrågningar och privata referenser.

Browser-/integrationstester använder egna databaser under `.local/` och portarna 3100, 3101 och 3141. De ändrar inte din användardatabas. De använder uttryckliga HTTP-fixturer och en minimal PNG; de utför inte riktig inferens eller GPU-testning. Produktionsbygget måste finnas innan browser-/integrationstester körs. Chromium används från `/usr/bin/chromium`, från Playwrights installation eller via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Kvar att konfigurera lokalt

Starta ComfyUI Desktop, installera kompatibla modeller, kontrollera den riktiga serveradressen och generera en provbild. Installera/starta Ollama och dess valda modell för riktiga chattrepliker. Om du vill ha identitetsstyrning utöver text och seed behövs ett fungerande, modellkompatibelt referens-/LoRA-workflow.

Inte inkluderat: garanti om ansiktskonsekvens, egen tränad identitets-LoRA, streaming av AI-svar, automatisk långtidssammanfattning, kryptering på disk, fleranvändarkonton, bildjobbsavbrytning eller import av JSON-export. UI:t innehåller inga påhittade foton; verkliga modellbilder uppstår först när ditt lokala ComfyUI-jobb lyckas.
