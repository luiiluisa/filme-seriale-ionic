# Filme și seriale — PDM, Ionic1, Ionic2 și Ionic3

Aplicație pentru o colecție personală de filme și seriale. Utilizatorul își poate crea un cont, poate vedea colecția și poate adăuga, edita sau șterge titluri. Modificările făcute dintr-o fereastră apar automat în celelalte ferestre deschise cu același cont.

## Structură

Clientul folosește Ionic React, TypeScript, Vite și configurația Capacitor. Deschide folderul clientului în WebStorm. Serverul este un proiect Node.js separat, în folderul alăturat, și folosește HTTP, JWT și WebSocket.

| Fișier sau folder | Rol |
|---|---|
| src/App.tsx | Alege între autentificare, listă și ecranul de detalii/editare |
| src/auth | Formular de autentificare, AuthProvider și apeluri REST pentru conturi |
| src/film/FilmProps.ts | Modelul unui titlu |
| src/film/FilmList.tsx, Film.tsx, FilmDetail.tsx, FilmEdit.tsx | Lista, rândul din listă, pagina de detalii și formularul reutilizat la adăugare și editare |
| src/film/FilmProvider.tsx, filmApi.ts | Starea colecției, apelurile REST și conexiunea WebSocket |
| ../filme-seriale-server/src | Serverul HTTP, autentificarea, rutele pentru titluri și notificările |
| ../filme-seriale-server/db | Fișierele JSON pentru conturi și colecții, create local la utilizare |

## Modelul unui titlu

| Câmp | Tip | Exemplu |
|---|---|---|
| title | text | Interstellar |
| kind | text, film sau serial | film |
| rating | număr între 1 și 5 | 4.5 |
| releaseDate | dată calendaristică în format YYYY-MM-DD | 2014-11-07 |
| watched | boolean | true |

Serverul generează identificatorul titlului și îl asociază cu utilizatorul autentificat. Formularul și serverul verifică nota și data.

## Cerințe Ionic1 implementate

- **Master–detail.** Lista afișează titlul, tipul, nota, data și starea de vizionare. Selectarea unui titlu deschide o pagină de detalii separată. Butoanele Modifică și Șterge sunt vizibile pe fiecare rând. Butonul **+** deschide același formular pentru un titlu nou.
- **REST.** Clientul încarcă lista prin GET /api/films, creează un titlu prin POST /api/films și editează prin PUT /api/films/:id. Serverul oferă și GET /api/films/:id pentru detalii și DELETE /api/films/:id pentru ștergere. Titlurile sunt persistate pe server.
- **WebSocket.** După autentificare, FilmProvider deschide o conexiune la server și trimite tokenul. La salvare, serverul trimite evenimentul created sau updated cu titlul salvat. La ștergere, trimite deleted, iar clientul scoate titlul din listă după ID.
- **Conturi.** Înregistrarea și autentificarea returnează un JWT. Fiecare cont are propria colecție și primește la înregistrare aceleași cinci titluri de pornire. Parolele sunt stocate sub formă de hash cu salt.

## Pornire pe Windows

Folosește Node.js 22.12+ sau o versiune LTS mai nouă. Deschide două terminale PowerShell în folderul Proiect.

În primul terminal, pornește serverul. Fișierul .env se generează doar dacă lipsește.

    cd filme-seriale-server
    npm.cmd ci
    if (-not (Test-Path .env)) {
        "JWT_SECRET=$(node -p 'require("node:crypto").randomBytes(32).toString("hex")')" | Set-Content .env -Encoding ascii
    }
    npm.cmd start

În al doilea terminal, pornește clientul.

    cd filme-seriale
    npm.cmd ci
    npm.cmd run dev

Deschide http://localhost:5173. Serverul ascultă pe http://localhost:3001. Dacă folosești Ionic CLI, poți porni clientul și cu ionic serve la http://localhost:8100. Pentru apelurile către server folosește adresa cu localhost.

## Demonstrație

1. Creează un cont cu un nume de utilizator și o parolă de cel puțin 3 caractere și adaugă un film și un serial.
2. Apasă pe un titlu pentru a-i vedea detaliile. Revino la listă, apasă Modifică, schimbă nota sau data și salvează.
3. Deschide aplicația într-o a doua fereastră cu același cont. Lasă lista vizibilă acolo, apoi adaugă, editează sau șterge un titlu în prima fereastră. A doua listă se actualizează automat.
4. Intră cu alt cont și verifică faptul că are o colecție separată.

## Cerințe Ionic2 implementate

| Barem | Implementare |
|---|---|
| 1p — stare rețea | Indicator Online/Offline în listă, detalii și editare. Dacă serverul devine indisponibil în timp ce dispozitivul are rețea, lista afișează un mesaj și folosește datele locale. |
| 1p — autentificare | JWT păstrat în localStorage, restaurarea sesiunii, revenire la login la expirare și deconectare. |
| 1p — resurse pe utilizator | REST verifică tokenul și proprietarul. WebSocket autentifică sesiunea înainte de a trimite evenimente și le distribuie doar contului căruia îi aparține titlul. Cache-ul și coada sunt separate pe cont. |
| 2p — comportament online/offline | Datele descărcate se păstrează local. La salvare, aplicația încearcă REST când are rețea. Când e offline sau serverul e temporar indisponibil, persistă modificarea într-o coadă și marchează titlurile cu Netrimis. Bara afișează numărul operațiunilor în așteptare, inclusiv ștergerile. |
| 1p — sincronizare | La revenirea online, aplicația trimite automat operațiunile restante. Încearcă din nou la fiecare 5 secunde cât timp există modificări de trimis. Reîncercarea aceleiași adăugări folosește același ID. |
| 2p — paginare | Clientul solicită câte 5 titluri prin REST. Următoarea pagină se încarcă la derulare sau prin Încarcă mai multe. Offline, paginarea folosește titlurile deja descărcate. |
| 1p — căutare și filtrare | Căutare după titlu, filtre după tip și starea de vizionare. Online filtrele se aplică pe server, offline pe datele locale. |

Pentru demonstrație, pornește clientul și serverul, intră în cont și încarcă lista. Cu pagina deschisă, setează Offline în instrumentele browserului. Adaugă un titlu și modifică unul existent. Verifică indicatorul Offline, marcajele Netrimis și numărul de operațiuni. Revino Online și urmărește cum dispar marcajele după sincronizare. Pentru paginare, folosește o colecție cu mai mult de 5 titluri. Pentru un eșec REST cu rețeaua activă, oprește serverul, salvează un titlu și pornește serverul din nou.

Testele clientului se rulează cu comanda npm.cmd run test.unit -- --run --pool=threads.

## Cerințe Ionic3 implementate

| Barem | Demonstrație |
|---|---|
| 1p — Cameră | Deschide Modifică, apasă Fă o fotografie, permite accesul la cameră și apasă Capturează. Alege o fotografie permite și importul unui fișier. |
| 1p — Afișare | În editare apare previzualizarea, în listă apare miniatura, iar în Detalii apare fotografia mărită. |
| 1p — Sistem de fișiere | Fotografia este scrisă ca fișier JPEG în sistemul de fișiere privat al browserului (OPFS). Titlul și fotografia sunt disponibile offline după ce au fost salvate sau descărcate local. |
| 1p — Upload | La Salvează, fotografia este încărcată împreună cu titlul și stocată separat în db/photos pe server. Offline intră în coada de sincronizare Ionic2. Descărcarea cere autentificare și verificarea proprietarului. |
| 1,5p — Alegere pe hartă | Din Modifică, apasă Alege locația, selectează un punct și confirmă cu Folosește această locație. Locația mea centrează harta pe poziția dispozitivului. Salvează titlul pentru a păstra coordonatele. |
| 1,5p — Afișare pe hartă | Din Detalii, apasă Vezi pe hartă. Harta se deschide la coordonatele salvate, cu un marcaj. |
| 1p — Animație | Cardul de detalii are animație de apariție. |
| 1p — Suprascriere animație Ionic | Fereastra hărții folosește animații proprii de intrare și ieșire prin enterAnimation și leaveAnimation. Ambele animații țin cont de preferința pentru mișcare redusă. |

Pentru cameră, locație și OPFS, deschide aplicația la http://localhost:5173 sau pe HTTPS, într-un browser compatibil. Fundalul hărții Leaflet este livrat de OpenStreetMap și are nevoie de internet. Poți verifica uploadul deschizând același cont într-o fereastră InPrivate și uitându-te după miniatură și locație. Pentru testul offline, lasă aplicația deschisă, schimbă sau capturează fotografia cu rețeaua dezactivată, apoi revino online pentru sincronizare.
