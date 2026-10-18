# Windows: uppdatera PrivateCompanion och anslut ComfyUI Desktop

Den uppdaterade koden finns på **`codex/privatecompanion-v1`** i `trovajskimedia-debug/private-ai-companion`. Node.js **24 LTS** rekommenderas. Kommandona nedan körs i PowerShell i projektmappen som innehåller `package.json`. Använd `npm.cmd` så att PowerShells policy för `.ps1` inte stoppar npm.

## 1. Bevara dina befintliga data

Stoppa appen med **Ctrl+C** innan du kopierar databasen. Behåll ComfyUI-installationen separat.

Ta en kopia av följande utanför projektmappen innan uppdateringen:

- `.env`, om filen finns.
- `prisma/dev.db`, om du använder standarddatabasen. Kopiera eventuella tillhörande `dev.db-wal` och `dev.db-shm` också när appen är stoppad. Om du har ändrat `DATABASE_URL`, säkerhetskopiera den databas som den pekar på.
- Hela `data`-mappen, om den finns. Den innehåller genererade bilder och referensbilder.

Kopiera inte säkerhetskopior till GitHub. De innehåller privata data. Appens migrering lägger till nya kolumner och tabeller; den återställer inte din databas. Profiluppgraderingen testas automatiskt mot en databas med befintliga karaktärer och meddelanden.

## 2A. Om du använder Git

Öppna PowerShell i din befintliga projektmapp. Kontrollera först `git status --short`. Om kommandot visar egna kodändringar: spara dem innan du uppdaterar; använd inte `reset --hard` eller `clean`.

```powershell
git fetch origin
git switch codex/privatecompanion-v1
git pull --ff-only origin codex/privatecompanion-v1
npm.cmd ci
npm.cmd run db:deploy
npm.cmd run dev
```

Om grenen finns endast på GitHub kan `git switch` normalt skapa en lokal gren som följer den. Om Git i stället rapporterar att grenen inte finns, kör `git switch --track origin/codex/privatecompanion-v1`.

Behåll din befintliga `.env` och databas. För en helt ny installation kan du skapa konfigurationen **innan** databassteget med:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

## 2B. Om du tidigare använde Download ZIP

En ZIP-installation har normalt ingen `.git`-mapp. Där fungerar inte `git pull`.

1. Öppna https://github.com/trovajskimedia-debug/private-ai-companion/tree/codex/privatecompanion-v1 medan du är inloggad på GitHub.
2. Välj **Code → Download ZIP**. Högerklicka på ZIP-filen och välj **Extrahera alla** till en **ny mapp**.
3. Öppna den nya projektmappen som innehåller `package.json`.
4. Kopiera din gamla `.env` till den nya projektmappen. Kopiera din gamla `prisma/dev.db` till den nya mappens `prisma`-mapp och din gamla `data`-mapp till den nya projektmappen. Kopiera endast datafilerna; behåll den nya kodens `prisma/schema.prisma` och `prisma/migrations`.
5. Skriv `powershell` i Utforskarens adressfält och tryck Enter.
6. Kör ett kommando i taget:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run db:deploy
npm.cmd run dev
```

Låt terminalen vara öppen. När den visar **Ready**, öppna `http://127.0.0.1:3000` i Edge eller Chrome. Din gamla lösenfras gäller om du har flyttat med den gamla databasen; annars skapar du en ny vid första besöket.

## 3. Kontrollera ComfyUI Desktop

1. Starta **ComfyUI Desktop** och vänta tills dess server är startad.
2. Läs serveradressen i Desktop-fönstret eller dess serverinställningar. Desktop använder ofta `http://127.0.0.1:8000`; en fristående ComfyUI-installation använder ofta `http://127.0.0.1:8188`. Använd adressen som **din** installation faktiskt visar.
3. Kontrollera från PowerShell, exempelvis om porten är 8000:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/system_stats
```

Ett JSON-objekt med systeminformation visar att API:t svarar. Om det inte svarar: kontrollera att ComfyUI är startat och att adress/port stämmer.

Appen och ComfyUI ska köras på samma Windows-dator i detta upplägg. `127.0.0.1` i en Codex-molnmiljö når inte din Windows-dator. Inga portöppningar mot internet behövs för det lokala upplägget.

## 4. Z-Image-Turbo: modellerna

Den medföljande mallen kommer från Comfy-organisationens officiella workflow-repository. Ursprungsfil, fixerad källversion, SHA-256 och MIT-licens finns i `workflows/SOURCE.md` och `workflows/COMFY-LICENSE.txt`.

Den officiella standardvarianten använder:

| Typ        | Officiellt filnamn               | ComfyUI-modellmapp         |
| ---------- | -------------------------------- | -------------------------- |
| Bildmodell | `z_image_turbo_bf16.safetensors` | `models/diffusion_models/` |
| Textkodare | `qwen_3_4b.safetensors`          | `models/text_encoders/`    |
| VAE        | `ae.safetensors`                 | `models/vae/`              |

ComfyUI Desktop kan hjälpa till att installera saknade modeller när du öppnar en mall. Använd modellmapparna som tillhör just din Desktop-installation; anta inte att de finns inne i appens projektmapp. De officiella modellänkarna finns i den visuella workflow-filens anteckning och på https://huggingface.co/Comfy-Org/z_image_turbo.

Om du har installerat andra filnamn eller en kvantiserad variant ska du välja de faktiskt installerade filerna och ett workflow som stöder dem. Ett GGUF-workflow kan till exempel kräva andra laddarnoder. Byt då inte bara filnamnet i en bf16-mall.

RTX 3060 finns i varianter med olika VRAM. Börja med **512 × 768**, en bild åt gången och mallens **8 steg, CFG 1**. Fulla bf16-modellen och textkodaren kräver betydande minne; CPU-offload, ledigt RAM, precision och andra GPU-program påverkar om körningen får plats. Ett godkänt API-test bevisar inte att hela GPU-körningen får plats. Generera en bild för att testa det. Vid minnesfel visar appen ett särskilt meddelande; minska upplösningen och använd en konfiguration som fungerar i ComfyUI Desktop först.

## 5. Anslut appen och använd den officiella API-mallen

1. Lås upp PrivateCompanion och öppna **Settings & integrations**.
2. Ange den verkliga adressen i **ComfyUI server address**.
3. Klicka **Load official Z-Image-Turbo template**. Den läser ett medföljande API-workflow baserat på den officiella grafen; inga nod-ID:n gissas av appen.
4. Kontrollera fälten **Diffusion model / checkpoint**, **Text encoder** och **VAE**. Filnamnen måste finnas i din installation.
5. Låt bildstorleken börja på **512 × 768**.
6. Klicka **Test connection & workflow**. Appen läser `/system_stats` och `/object_info` från din ComfyUI och kontrollerar nodtyper, modellval och kopplingar. Listorna över installerade modellfiler blir tillgängliga i modellfälten.
7. Åtgärda eventuella saknade modeller/noder och testa igen.
8. Klicka **Save ComfyUI settings**. Inställningarna sparas i din lokala SQLite-databas och börjar gälla utan omstart.
9. Öppna en karaktär i **Character studio** och klicka **Generate realistic preview**. Nu utförs den verkliga bildgenereringen på din dator. Karaktären sparas före genereringen.

När bilden är färdig blir den karaktärens huvudbild i studion, översikten och chatten. Före den första lyckade genereringen visas en tydligt märkt illustrerad reservbild. Utseendereglagen skriver en prompt; de ändrar inte en redan genererad bild. Generera om efter ändringar.

## 6. Exportera ett eget fungerande workflow från Desktop

Om den medföljande mallen inte passar din modellvariant:

1. Klicka **Download the official visual ComfyUI workflow** i appens inställningar, eller använd `public/workflows/z-image-turbo.comfy.json` från repot.
2. Dra JSON-filen till ComfyUI Desktop. Välj installerade modeller och kör en provbild där först.
3. Exportera **API-format** från ComfyUI:s meny, ofta **File → Export (API)** eller **Workflow → Export (API)** beroende på frontend-version. Om API-export inte visas, aktivera utvecklaralternativ/Dev mode i ComfyUI-inställningarna. Vanlig **Save/Export** av en visuell graf är inte samma format.
4. I appen: välj **Import API workflow** och öppna API-JSON-filen.
5. Kontrollera **Positive prompt field**. Välj det textfält som är den positiva prompten. Om grafen har både positiv och negativ text väljer appen inte godtyckligt mellan dem.
6. Kontrollera bindningar för seed, bildmodell, textkodare, VAE, bredd och höjd. Alternativen kommer från den importerade grafens faktiska nod-ID:n och fält. **Keep workflow value / unused** behåller grafens egna värden.
7. Testa, spara och generera en förhandsvisning.

Ett API-workflow är ett objekt med nod-ID:n och `class_type`/`inputs`. En vanlig visuell export har normalt en `nodes`-lista; appen visar ett särskilt fel om fel format importeras. Äldre `{{PROMPT}}`-placeholderfiler bör exporteras på nytt och använda de explicita fältbindningarna.

## 7. Profiler, bilder i chatt och galleri

- Fyll i **Basic info**, **Personality**, **Backstory**, **Appearance**, **Wardrobe**, **Relationship** och **Advanced**. **Save changes** sparar hela profilen. I Advanced finns **Full character description**, konversationsstil, språk, seed och referensbilder.
- **Detailed appearance description** och utseendefälten skickas till ComfyUI. Biografi/hemligheter skickas inte till bildmodellen.
- Personlighet, bakgrund, full beskrivning, relation och konversationsstil används som en separat profil i Ollama. Privata detaljer är inkluderade i detta chattkontext; använd din egen betrodda lokala Ollama-server.
- Familjeroller är strikt icke-sexuella, även när familjetiteln skrivs som egen roll. Det finns särskilda systeminstruktioner, kontroll av begäran/svar och blockering av sexuella bildförfrågningar för dessa roller.
- Skriv exempelvis **Skicka en bild på dig i svarta leggings**. Med bildigenkänningen aktiverad köas en bild i ComfyUI och visas i chatten. Det går även att använda **Imagine a photo**.
- Bilder sparas i karaktärens galleri med prompt, seed och den inskickade grafen. Klicka en miniatyr för större bild och metadata, eller för att välja den som porträtt. Chattbilder kan öppnas i full storlek.
- Bildjobb sparas i databasen och kontrolleras när karaktärens chatt eller studio är öppen. ComfyUI fortsätter arbetet om appens sida stängs. Jobb som inte slutförs inom 15 minuter markeras som timeout vid nästa kontroll.

## 8. Referensbilder och igenkännbara karaktärer

Ladda upp en referensbild under **Advanced → Reference images**, välj den och spara. Endast PNG, JPEG och WebP upp till 10 MB stöds. Bilderna lagras privat, med autentiserad åtkomst.

Referensbilden används **bara om ditt importerade workflow faktiskt har stöd för referens/identitetsstyrning** och du har bundit dess bildinput i **Reference image field**. Appen laddar då upp den valda bilden till ComfyUI:s `/upload/image` och fyller rätt bildfält. Den medföljande vanliga Z-Image-Turbo-mallen är text-till-bild och innehåller inte en identitetsadapter. Att bara lägga till en okopplad `LoadImage`-nod bevarar inte ett ansikte.

Egna API-workflows kan innehålla LoRA- eller referensnoder om de är kompatibla med modellarkitekturen och installerade i din ComfyUI. Appen behåller grafen och dess inställningar. Någon färdig specialtränad identitets-LoRA eller universell identitetsadapter ingår inte.

Samma prompt, seed och modeller hjälper till att upprepa en bild, men **garanterar inte samma ansikte i olika scener**. RTX 3060, Z-Image-Turbo och din egen modellinstallation behöver provas lokalt; molntesterna använder HTTP-fixturer och verifierar programflödet, inte fotorealism eller din GPU.
