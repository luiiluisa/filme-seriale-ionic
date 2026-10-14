import { useCallback, useEffect, useState, type FC } from 'react';
import {
    IonButton,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonTitle,
    IonToolbar,
    useIonViewWillEnter,
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { Film, obtineFilme, stergeFilm } from '../services/api';
import './Home.css';

const Home: FC = () => {
    const [filme, setFilme] = useState<Film[]>([]); //lista de filmelor afisata pe pagina
    const [eroare, setEroare] = useState('');
    const navigate = useNavigate();

    const incarcaLista = useCallback(async () => {
        try {
            const lista = await obtineFilme();
            setFilme(lista);
            setEroare('');
        } catch {
            setEroare('Nu pot încărca lista. Verifică dacă serverul rulează.');
        }
    }, []);

    useIonViewWillEnter(() => {
        void incarcaLista();
    });

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:3000/ws');

        socket.onmessage = () => {
            void incarcaLista();
        };

        return () => socket.close();
    }, [incarcaLista]);

    async function sterge(id: number) {
        try {
            await stergeFilm(id);
            await incarcaLista();
        } catch {
            setEroare('Nu am putut șterge elementul.');
        }
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Filme și seriale</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Butonul de adăugare deschide formularul gol */}
            <IonContent className="ion-padding library-content">
                <div className="library-shell">
                <div className="library-intro">
                    <h1>Colecția mea</h1>
                    <p>Apasă pe un titlu pentru a vedea detaliile.</p>
                    <span className="collection-count">{filme.length} titluri în colecție</span>
                </div>
                <IonButton expand="block" onClick={() => navigate('/edit')}>
                    Adaugă film sau serial
                </IonButton>

                {eroare && <p role="alert" className="feedback">{eroare}</p>}

                <IonList>
                    {filme.map((film) => ( //afisare
                        <IonItem key={film.id} button detail onClick={() => navigate(`/filme/${film.id}`)}>
                            <IonLabel>
                                <h2>{film.titlu}</h2>
                                <p>
                                    {film.tip} · {film.gen} · {film.an}
                                </p>
                                <p>{film.vazut ? 'Văzut' : 'Nevăzut'}</p>
                            </IonLabel>

                            <IonButton
                                slot="end" //buton de edit => formularul cu ID filmului
                                onClick={(event) => { event.stopPropagation(); navigate(`/edit/${film.id}`); }}
                            >
                                Modifică
                            </IonButton>

                            <IonButton
                                slot="end"
                                color="danger"
                                onClick={(event) => { event.stopPropagation(); void sterge(film.id); }}
                            >
                                Șterge
                            </IonButton>
                        </IonItem>
                    ))}
                </IonList>
                {!eroare && filme.length === 0 && <p className="empty-collection">Colecția ta începe cu primul titlu. Adaugă un film sau un serial.</p>}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Home;
