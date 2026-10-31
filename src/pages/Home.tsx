import { useCallback, useEffect, useRef, useState } from 'react';
import {
    IonButton, IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent,
    IonItem, IonLabel, IonList, IonPage, IonSearchbar, IonSelect,
    IonSelectOption, IonTitle, IonToolbar,
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { CHANGE, connectSocket, Film, getSession, logout, obtinePagina, stergeFilm } from '../services/api';
import './Home.css';

export default function Home() {
    const [films, setFilms] = useState<Film[]>([]);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const [tip, setTip] = useState('');
    const [vazut, setVazut] = useState('');
    const [page, setPage] = useState(0);
    const [more, setMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [cached, setCached] = useState(false);
    const [busy, setBusy] = useState(false);
    const generation = useRef(0);
    const navigate = useNavigate();
    const invalidate = useCallback(() => { generation.current++; }, []);

    const load = useCallback(async (next = 0) => {
        const current = ++generation.current;
        setBusy(true);
        try {
            const data = await obtinePagina(next, { q, tip, vazut });
            if (current !== generation.current) return;
            setFilms(previous => next === 0 ? data.items :
                [...new Map([...previous, ...data.items].map(f => [f.id, f])).values()]);
            setPage(next);
            setMore(data.hasMore);
            setTotal(data.total);
            setCached(!!data.cached);
            setError('');
        } catch (e) {
            if (current === generation.current) setError(e instanceof Error ? e.message : 'Nu pot încărca lista.');
        } finally {
            if (current === generation.current) setBusy(false);
        }
    }, [q, tip, vazut]);

    useEffect(() => {
        void load();
        const update = () => { void load(); };
        window.addEventListener(CHANGE, update);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        const close = connectSocket(update);
        return () => {
            invalidate();
            close();
            window.removeEventListener(CHANGE, update);
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, [load, invalidate]);

    async function remove(id: number) {
        try { await stergeFilm(id); await load(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Ștergere eșuată.'); }
    }

    return (
        <IonPage>
            <IonHeader><IonToolbar>
                <IonTitle>Filme și seriale</IonTitle>
                <IonButton slot="end" fill="clear" onClick={logout}>Ieșire ({getSession()?.username})</IonButton>
            </IonToolbar></IonHeader>
            <IonContent className="ion-padding library-content">
                <div className="library-shell">
                    <div className="library-intro">
                        <h1>Colecția mea</h1>
                        <p>Apasă pe un titlu pentru a vedea detaliile.</p>
                        <span className="collection-count">{total} titluri{cached ? ' disponibile local' : ''}</span>
                    </div>
                    <IonButton expand="block" onClick={() => navigate('/edit')}>Adaugă film sau serial</IonButton>
                    <IonSearchbar aria-label="Caută după titlu" placeholder="Caută după titlu" debounce={300}
                        value={q} onIonInput={e => setQ(e.detail.value || '')} />
                    <IonItem>
                        <IonSelect label="Tip" labelPlacement="stacked" style={{ flex: 1, marginRight: 20 }} value={tip} onIonChange={e => setTip(e.detail.value)}>
                            <IonSelectOption value="">Toate</IonSelectOption>
                            <IonSelectOption value="film">Filme</IonSelectOption>
                            <IonSelectOption value="serial">Seriale</IonSelectOption>
                        </IonSelect>
                        <IonSelect label="Vizionare" labelPlacement="stacked" style={{ flex: 1 }} value={vazut} onIonChange={e => setVazut(e.detail.value)}>
                            <IonSelectOption value="">Toate</IonSelectOption>
                            <IonSelectOption value="1">Văzute</IonSelectOption>
                            <IonSelectOption value="0">Nevăzute</IonSelectOption>
                        </IonSelect>
                    </IonItem>
                    {cached && <p role="status">Server indisponibil sau mod offline. Afișăm titlurile salvate pe acest dispozitiv.</p>}
                    {error && <p role="alert">{error}</p>}
                    <IonList>
                        {films.map(f => (
                            <IonItem key={f.id} button detail onClick={() => navigate(`/filme/${f.id}`)}>
                                <IonLabel>
                                    <h2>{f.titlu}</h2>
                                    <p>{f.tip} · {f.gen} · {f.an}</p>
                                    <p>{f.vazut ? 'Văzut' : 'Nevăzut'}{f.pending ? ' · Salvat local, în așteptare' : ''}</p>
                                </IonLabel>
                                <IonButton slot="end" onClick={e => { e.stopPropagation(); navigate(`/edit/${f.id}`); }}>Modifică</IonButton>
                                <IonButton slot="end" color="danger" onClick={e => { e.stopPropagation(); void remove(f.id); }}>Șterge</IonButton>
                            </IonItem>
                        ))}
                    </IonList>
                    {!busy && !films.length && <p>Niciun titlu pentru selecția curentă.</p>}
                    {busy && <p role="status">Se încarcă…</p>}
                    <IonInfiniteScroll disabled={!more || busy} onIonInfinite={async e => {
                        await load(page + 1);
                        await e.target.complete();
                    }}>
                        <IonInfiniteScrollContent loadingText="Se încarcă titluri…" />
                    </IonInfiniteScroll>
                    {more && <IonButton fill="outline" disabled={busy} onClick={() => void load(page + 1)}>Încarcă mai multe</IonButton>}
                </div>
            </IonContent>
        </IonPage>
    );
}
