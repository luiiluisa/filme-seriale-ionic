export type TipMedia = 'film' | 'serial';

export interface Film {
    id: number;
    titlu: string;
    tip: TipMedia;
    gen: string;
    an: number;
    vazut: boolean;
}

export type FilmNou = Omit<Film, 'id'>;

const ADRESA = 'http://localhost:3000/api/filme';

export async function obtineFilme(): Promise<Film[]> {
    const raspuns = await fetch(ADRESA);
    if (!raspuns.ok) throw new Error('Nu am putut încărca lista.');
    return raspuns.json();
}

export async function obtineFilm(id: number): Promise<Film> {
    const raspuns = await fetch(`${ADRESA}/${id}`);
    if (!raspuns.ok) throw new Error('Nu am putut încărca elementul.');
    return raspuns.json();
}

export async function adaugaFilm(film: FilmNou): Promise<Film> {
    const raspuns = await fetch(ADRESA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(film),
    });
    if (!raspuns.ok) throw new Error('Nu am putut adăuga elementul.');
    return raspuns.json();
}

export async function modificaFilm(id: number, film: FilmNou): Promise<Film> {
    const raspuns = await fetch(`${ADRESA}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(film),
    });
    if (!raspuns.ok) throw new Error('Nu am putut modifica elementul.');
    return raspuns.json();
}

export async function stergeFilm(id: number): Promise<void> {
    const raspuns = await fetch(`${ADRESA}/${id}`, { method: 'DELETE' });
    if (!raspuns.ok) throw new Error('Nu am putut șterge elementul.');
}