import { useCallback, useEffect, useState } from 'react';
import { IonButton, IonContent, IonHeader, IonPage, IonSpinner, IonTitle, IonToolbar, useIonViewWillEnter } from '@ionic/react';
import { useNavigate, useParams } from 'react-router-dom';
import { type Film, obtineFilm } from '../services/api';
import './Home.css';

const Detail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [film, setFilm] = useState<Film | null>(null);
    const [eroare, setEroare] = useState('');
    const [incarcare, setIncarcare] = useState(true);

    const incarca = useCallback(async () => {
        setIncarcare(true);
        setEroare('');
        try {
            if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) throw new Error();
            setFilm(await obtineFilm(Number(id)));
        } catch {
            setFilm(null);
            setEroare('Nu am putut încărca titlul. Este posibil să fi fost șters sau serverul să nu fie disponibil.');
        } finally {
            setIncarcare(false);
        }
    }, [id]);

    useIonViewWillEnter(() => { void incarca(); }, [incarca]);
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:3000/ws');
        socket.onmessage = () => { void incarca(); };
        return () => socket.close();
    }, [incarca]);

    return (
        <IonPage>
            <IonHeader><IonToolbar><IonTitle>Detalii titlu</IonTitle></IonToolbar></IonHeader>
            <IonContent className="ion-padding library-content">
                <div className="detail-shell">
                    <IonButton fill="clear" onClick={() => navigate('/home')}>← Înapoi la colecție</IonButton>
                    {incarcare ? <div className="detail-loading" role="status"><IonSpinner /><p>Se încarcă detaliile…</p></div> : eroare ? (
                        <div className="feedback" role="alert"><p>{eroare}</p><IonButton onClick={() => void incarca()}>Încearcă din nou</IonButton></div>
                    ) : film && (
                        <article className="detail-card">
                            <div className="detail-info">
                                <span className="eyebrow">{film.tip === 'film' ? 'FILM' : 'SERIAL'} · {film.gen}</span>
                                <h1>{film.titlu}</h1>
                                <span className={`watch-status ${film.vazut ? 'watched' : ''}`}>{film.vazut ? '✓ Văzut' : '◷ De urmărit'}</span>
                                <dl className="detail-facts">
                                    <div><dt>Tip</dt><dd>{film.tip === 'film' ? 'Film' : 'Serial'}</dd></div>
                                    <div><dt>Gen</dt><dd>{film.gen}</dd></div>
                                    <div><dt>Anul apariției</dt><dd>{film.an}</dd></div>
                                    <div><dt>Vizionare</dt><dd>{film.vazut ? 'Văzut' : 'Nevăzut'}</dd></div>
                                </dl>
                                <IonButton expand="block" onClick={() => navigate(`/edit/${film.id}`)}>Editează detaliile</IonButton>
                            </div>
                        </article>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Detail;
