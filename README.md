# Filme și seriale — Ionic2

Aplicație Ionic React cu server Express și bază de date SQLite.

## Pornire

Într-un terminal, din rădăcina proiectului:

```powershell
npm install
npm --prefix server install
npm --prefix server start
```

În al doilea terminal:

```powershell
npm run dev
```

Deschide http://localhost:5173. Vite transmite cererile `/api` și conexiunile `/ws` către serverul de pe portul 3000. Nu sunt necesare adrese diferite în client.

Cont demonstrativ: **demo / demo123**. Filmele existente înainte de Ionic2 sunt asociate acestui cont. Din pagina de autentificare poți crea alte conturi; fiecare are propria colecție.

## Cerințe Ionic2 implementate

- Status online/offline permanent vizibil.
- Login, creare cont, logout, token JWT păstrat în localStorage și restaurarea sesiunii la pornire. Tokenurile expirate redeschid autentificarea. Parolele sunt hash-uite cu bcrypt.
- Rute REST protejate cu JWT; toate operațiile sunt limitate la utilizatorul autentificat. WebSocket cere tokenul înainte de a primi notificări, trimite doar modificările utilizatorului și închide sesiunea la expirarea tokenului.
- Datele încărcate se păstrează local, separat pentru fiecare cont. Offline sunt disponibile doar titlurile deja încărcate pe dispozitiv și cele create local.
- Crearea, modificarea și ștergerea se păstrează într-o coadă persistentă. Online, aplicația încearcă trimiterea imediat; dacă rețeaua/serverul nu răspunde, modificările rămân local. Bara de status arată câte modificări nu au fost trimise, iar titlurile au marcajul „în așteptare”.
- Sincronizare automată la revenirea online, după login și prin reîncercare la 15 secunde. Modificările sunt trimise în ordine, iar ID-urile temporare sunt înlocuite cu ID-urile serverului. Reîncercarea unei creări folosește un identificator unic pentru a evita dublurile.
- Paginare pe server (10 titluri/pagină), infinite scrolling și buton „Încarcă mai multe”.
- Căutare după titlu și filtre după tip (film/serial) și vizionare. Offline, căutarea și paginarea folosesc datele locale.

Cheile localStorage sunt `filme-session` și `filme-data-<userId>`. Logout elimină sesiunea, păstrând datele și modificările nesincronizate pentru următoarea autentificare în același cont.

## Verificare manuală

1. Intră cu contul demo, reîncarcă pagina și verifică păstrarea sesiunii.
2. Folosește căutarea și filtrele. Pentru paginare, creează peste 10 titluri în același cont.
3. Treci în modul Offline din instrumentele browserului. Adaugă un titlu și modifică unul deja încărcat. Verifică marcajul local și numărul de modificări netrimise.
4. Revino online: modificările se trimit automat și marcajele dispar. Același scenariu poate fi verificat oprind și repornind serverul, cu clientul deschis.
5. Fă logout și creează un alt cont. Colecția demo nu trebuie să fie vizibilă. Pentru WebSocket, deschide același cont în două ferestre și verifică actualizarea listei după o modificare.

## Teste

```powershell
npm run build
npm run lint
npm run test.unit -- --run
npm --prefix server test
```

Testele client verifică persistența offline, ID-urile temporare, reîncercarea fără dubluri, izolarea conturilor, căutarea și paginarea locală. Testele server folosesc o bază de date în memorie și verifică JWT, accesul între conturi, REST, paginare, filtre și WebSocket.

## API

- `POST /api/auth/login`, `POST /api/auth/register`: `{ username, password }` → `{ token, username, userId }`.
- `GET /api/filme?page=0&limit=10&q=&tip=&vazut=` → `{ items, total, hasMore }`.
- `GET /api/filme/:id`, `POST /api/filme`, `PUT /api/filme/:id`, `DELETE /api/filme/:id`.
- REST folosește antetul `Authorization: Bearer <token>`.
- `/ws`: primul mesaj este `{ "token": "<token>" }`, apoi serverul confirmă autentificarea și emite `lista-modificata`.

SQLite: `server/filme-seriale.db`. Cheia de semnare JWT se generează și se păstrează local în baza de date; poate fi înlocuită prin `JWT_SECRET`. Pentru teste, `DB_PATH=:memory:` permite o bază izolată. Serverul poate folosi `PORT` în locul portului implicit 3000.
