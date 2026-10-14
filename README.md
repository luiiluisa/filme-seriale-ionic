# Filme și seriale

Aplicație Ionic React pentru gestionarea unei liste de filme și seriale.

## Funcționalități

- Afișarea listei de filme și seriale
- Adăugarea unui film sau serial
- Modificarea unui element existent
- Ștergerea unui element
- Salvarea datelor într-o bază de date SQLite
- Comunicarea cu serverul printr-un API REST
- Actualizarea listei în paginile deschise, prin notificări WebSocket

## Datele unui film sau serial

Fiecare element conține:

- `id` – identificator numeric
- `titlu` – titlul filmului sau serialului
- `tip` – tipul elementului: `film` sau `serial`
- `gen` – genul
- `an` – anul apariției
- `vazut` – valoare booleană ce indică dacă a fost văzut

## Interfața aplicației

Aplicația are două pagini principale:

- **Lista** (`/home`) – afișează filmele și serialele și permite adăugarea, modificarea sau ștergerea lor.
- **Adăugare/Modificare** (`/edit`, `/edit/:id`) – formular folosit pentru adăugarea unui element nou sau modificarea unuia existent.

La modificare, formularul încarcă datele elementului selectat. La adăugare, formularul este gol.

## Stocarea și sincronizarea datelor

Datele sunt salvate în baza de date SQLite din fișierul:

`server/filme-seriale.db`

Serverul creează fișierul și tabelul `filme` la pornire. Dacă tabelul este gol, sunt adăugate două exemple inițiale. Filmele adăugate ulterior rămân salvate după oprirea și repornirea serverului.

Când un film sau serial este adăugat, modificat ori șters, serverul trimite o notificare WebSocket. Paginile conectate primesc notificarea și reîncarcă lista de la server.

## Tehnologii

- Ionic React
- React
- TypeScript
- Node.js
- Express
- SQLite
- API REST
- WebSocket

## API REST

Serverul rulează la `http://localhost:3000`.

| Metodă | Rută | Acțiune |
|---|---|---|
| `GET` | `/api/filme` | Obține lista |
| `GET` | `/api/filme/:id` | Obține un element după ID |
| `POST` | `/api/filme` | Adaugă un element |
| `PUT` | `/api/filme/:id` | Modifică un element |
| `DELETE` | `/api/filme/:id` | Șterge un element |

Conexiunea WebSocket este disponibilă la `ws://localhost:3000/ws`.

## Rulare

Ai nevoie de Node.js și npm instalate.

### 1. Pornirea serverului

Deschide un terminal în folderul principal al proiectului și rulează:

```bash
cd server
npm install
node index.js```

Într-un al doilea terminal, din rădăcina proiectului, rulează:

```bash
npm ci
npm run dev
```
