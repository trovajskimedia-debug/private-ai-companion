# PrivateCompanion AI

En fungerande första version av en privat följeslagarapp byggd med **Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma 6 och SQLite**. Ingen extern AI-leverantör används automatiskt.

## Kom igång

Node.js 22+ och npm krävs; utvecklingsmiljön har verifierats med Node.js 24.

```sh
cd /workspace/private-ai-companion
cp .env.example .env  # endast om .env inte redan finns
npm ci
npm run db:deploy
npm run dev
```

Öppna appen via din utvecklingsmiljö. Servern lyssnar normalt endast på loopback. Skapa en egen lösenfras på minst 12 tecken vid första besöket. Tre fiktiva vuxna karaktärer skapas samtidigt; de kan ändras eller tas bort. Det finns inget förvalt lösenord och ingen återställning via e-post.

För ett produktionsbygge:

```sh
npm run build
npm start
```

`db:deploy` skapar en saknad SQLite-fil utan att skriva över befintliga filer och tillämpar versionshanterade migreringar. Kommandot kan köras igen. SQLite-sökvägar i `DATABASE_URL` är relativa till `prisma/`, om de inte är absoluta. Standarddatabasen är `prisma/dev.db`.

## Testa på Windows, steg för steg

1. Installera **LTS-versionen av Node.js** från https://nodejs.org/. Behåll installationsprogrammets standardval. Stäng och öppna terminalen igen efter installationen.
2. Logga in på GitHub och öppna repot. Om appens pull request ännu inte har slagits ihop med `main`, välj appens gren i grenmenyn ovanför fillistan. Klicka på den gröna knappen **Code**, sedan **Download ZIP**.
3. Högerklicka på ZIP-filen i Windows Utforskaren och välj **Extrahera alla**. Öppna den uppackade projektmappen som innehåller `package.json`.
4. Högerklicka på en tom yta i mappen och välj **Öppna i Terminal**. Alternativt: skriv `powershell` i Utforskarens adressfält och tryck Enter.
5. Kör följande kommandon i PowerShell, ett i taget. Vänta tills varje kommando är klart innan du kör nästa:

```powershell
node --version
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run db:deploy
npm.cmd run dev
```

`node --version` ska visa version 22 eller senare. `npm.cmd` används för att fungera även när PowerShell blockerar körning av `npm.ps1`. Ändra inte datorns säkerhetsinställningar för att komma runt detta.

6. När terminalen visar **Ready**, öppna `http://127.0.0.1:3000` i Edge eller Chrome på samma dator. Behåll terminalen öppen medan du testar appen.
7. Skapa din egen lösenfras på minst 12 tecken. Prova att redigera en karaktär, ändra kroppsreglage och klädfärger, spara och skicka ett meddelande i **Demo**-läget. Ladda om sidan för att kontrollera att ändringarna sparats.

Stoppa appen med **Ctrl+C** i terminalen. För att starta den igen öppnar du en terminal i samma projektmapp och kör `npm.cmd run dev`; installation och databasinitiering behöver normalt inte göras om.

Du behöver ingen separat AI-installation för att prova gränssnittet och demochatten. Riktiga AI-svar och bildgenerering kräver Ollama respektive ComfyUI enligt anvisningarna nedan. Windows får en egen lokal databas och lösenfras; privata data från molnmiljön laddas inte ner via GitHub.

## Funktioner i första versionen

- Responsivt gränssnitt med följeslagaröversikt, karaktärsstudio, garderob, relationer, chatt och integrationsinställningar.
- Skapa, redigera och radera fiktiva vuxna karaktärer (18+); välj bakgrund, personlighet och intressen.
- Höjd, kroppsbyggnad och kurvor med direkt uppdaterad SVG-förhandsvisning. Hudton, hårfärg och frisyr kan ändras.
- Yoga pants med sporttopp, vardagskläder och klänning; färgrutor och fria färgväljare. Valen sparas i SQLite och ingår i bildprompten.
- Vänskap, romantisk relation eller kreativt partnerskap; fem relationspoäng per slutfört chattutbyte, nivåer och delad historik.
- Lösenfras med saltad scrypt-hash, HTTP-only sessionscookie, serverlagrad sessionshash och sju dagars sessionslivslängd. Skydd mot cross-site skrivningar och begränsning av inloggningsförsök.
- Privat, beständig chatt med sidindelad historik. Demo använder tydligt märkta förskrivna svar. Ollama använder modellgenererade svar utan automatisk återgång till demo vid fel.
- ComfyUI-bildjobb sparas i databasen, återupptas när chatten öppnas, och lägger färdiga bilder direkt i konversationen. Bilder lagras privat och kräver upplåst session.
- JSON-export av profiler, relationer och meddelanden. Bildfiler följer inte med i JSON-exporten. Radering av chatt eller karaktär raderar även tillhörande bildfiler. Relationspoäng behålls när endast chatten raderas.

## Ollama

Installera och starta Ollama på en maskin som appservern kan nå. Installera en modell där, exempelvis:

```sh
ollama pull llama3.2:3b
ollama serve
```

Sätt följande i appserverns `.env` och starta om Next.js:

```dotenv
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="llama3.2:3b"
```

Modellnamnet måste exakt matcha en installerad modell. Välj **Ollama** i chattens lägesväljare. Personlighet, bakgrund, relationstyp och de senaste 40 textmeddelandena skickas till `/api/chat`. Första svaret kan ta tid när modellen laddas; timeout är 120 sekunder. Ett misslyckat anrop sparar varken ett halvfärdigt chattutbyte eller nya relationspoäng.

## ComfyUI och fotorealistiska bilder

Installera/starta ComfyUI separat med tillräckligt GPU-minne och en kompatibel, licensierad fotorealistisk Stable Diffusion- eller SDXL-checkpoint i dess modellkatalog. Appen laddar inte ner modeller automatiskt.

```dotenv
COMFYUI_BASE_URL="http://127.0.0.1:8188"
COMFYUI_CHECKPOINT="det-exakta-modellfilnamnet.safetensors"
```

Standardflödet använder ComfyUI-noderna `CheckpointLoaderSimple`, `CLIPTextEncode`, `EmptyLatentImage`, `KSampler`, `VAEDecode` och `SaveImage`: 768×1024, 25 steg, Euler, CFG 7. Det kräver en checkpoint med CLIP och VAE som stöder dessa noder. Flux och andra arkitekturer kräver ett eget kompatibelt flöde.

Starta om appen, kontrollera anslutningen i **Settings & integrations** och välj **Imagine a photo** i chatten. Beskriv en scen och välj **Generate with ComfyUI**. Karaktärens vuxna ålder, utseende och kläder läggs till i prompten. Appen köar `/prompt`, läser `/history/{prompt_id}` och hämtar resultatet från `/view`.

För ett eget flöde: exportera **API-format** från ComfyUI och sätt `COMFYUI_WORKFLOW_PATH` till en läsbar absolut JSON-sökväg. Använd `{{PROMPT}}` i textfält och `{{SEED}}` för ett slumpat frö. Strängplaceholdern för frö blir en numerisk sträng; använd en nod som stöder det, eller sätt ett numeriskt frö direkt i ditt flöde. Inkludera en `SaveImage`-nod. När ett eget flöde används krävs inte `COMFYUI_CHECKPOINT`.

Bilder begränsas till PNG, JPEG eller WebP och 20 MB. Bildjobb får 15 minuter innan timeout. Pollning sker när den aktuella chatten är öppen; beräkningen fortsätter i ComfyUI när sidan stängs och resultatet hämtas nästa gång chatten öppnas. Endast en bild åt gången köas per karaktär. Det finns ingen avbrytningsfunktion i version 1.

**Fotorealism och konsekvent karaktärsidentitet beror på modell och flöde.** Textprompten garanterar inte identiska ansikten, exakta färger eller kroppsproportioner mellan bilder. För identitetskontroll behövs ett anpassat flöde med exempelvis IP-Adapter/LoRA; det ingår inte i standardflödet. Den illustrerade förhandsvisningen är ingen genererad bild.

## Integritet och driftsättning

Detta är en **single-owner-app för en appserverprocess**, inte en plattform med separata användarkonton. Slutför första lösenfrasen innan servern exponeras för andra. För publik driftsättning behövs en betrodd HTTPS-reverseproxy, bevarad `Host`-header och `COOKIE_SECURE="true"`; standardinställningen är avsedd för lokal HTTP. Skydda även Ollama och ComfyUI från publik åtkomst.

SQLite, genererade bilder och säkerhetskopior är **inte krypterade på disk**. Lösenfrasen skyddar appåtkomst, inte serverns filsystem. Skydda server och backuper separat. Appen använder ingen analys- eller spårningstjänst. Anslutna AI-tjänster får innehållet som behövs för inferens; använd privata betrodda tjänster för att behålla lokal behandling.

`.env`, databaser, bilder och testutdata är Git-ignorerade. Spara inte hemligheter i repot. Säkerhetskopiera `prisma/dev.db` och `data/images/` tillsammans när appen är stoppad; anpassa sökvägen om `DATABASE_URL` ändrats. Exporten innehåller privata meddelanden och bör hanteras därefter. Radering i appen raderar inte separata säkerhetskopior.

Standardutveckling kräver inga API-nycklar. I molnmiljö måste pakethanterarens destinationer och `binaries.prisma.sh` tillåtas för Prisma-installation; kontrollsummor och TLS ska förbli aktiverade. Externa Ollama/ComfyUI-värdar kräver egen nätverksåtkomst. `127.0.0.1` syftar på appserverns maskin, inte din dator.

## Tester

```sh
npm test                    # Enhetstester: validering, autentisering, relationsnivåer och integrationsprotokoll
npm run typecheck
npm run build
npm run test:e2e            # Chromium: skapande, beständighet, garderob, chatt, integritet och mobilvy
npm run test:integrations   # HTTP-testservrar: Ollama, ComfyUI, återupptagna jobb, fel och privata bilder
```

Webbläsartester använder `/usr/bin/chromium` om den finns, annars Playwrights Chromium. Installera vid behov med `npx playwright install chromium`, eller ange `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Testerna skapar egna SQLite-filer under `.local/` och ändrar inte användardatabasen. Testportar: 3100, 3101 och 3141. Produktionsbygget måste finnas innan webbläsartesterna körs.

Integrationstesterna använder uttryckliga protokolltestservrar och en liten PNG-fixtur. De verifierar anropskedjan, inte faktisk AI-inferens eller fotorealistisk bildkvalitet. Riktiga Ollama-/ComfyUI-modeller behöver verifieras separat när tjänsterna är anslutna.

## Struktur

```text
src/app/                 Next.js-sidor, CSS och skyddade API-rutter
src/components/          Översikt, SVG-avatar, karaktärsstudio och chatt
src/lib/                 Databas, autentisering, validering och AI-integrationer
prisma/                  Schema och versionshanterade migreringar
scripts/migrate.mjs      Repeterbar SQLite-initiering och migrering
tests/                   Enhets-, webbläsar- och HTTP-integrationstester
```

## Återstående efter version 1

Riktiga modellanslutningar och utvärdering av bildkvalitet, streaming av AI-svar, valfri kryptering på disk, modelloberoende identitetskontroll för bilder, återställning/import av export, bildjobbsavbrytning och eventuell flerkontodrift. Ingen tidigare masterprompt ingick i den synliga konversationen; implementationen följer de uttryckliga kraven i beställningen.
