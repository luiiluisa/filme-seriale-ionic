import { useContext, useState } from 'react';
import {
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonPage,
    IonTitle,
    IonToolbar
} from '@ionic/react';
import { arrowBack } from 'ionicons/icons';

import { FilmContext } from './FilmProvider';
import { ConnectionStatus } from './ConnectionStatus';
import { FilmMapModal } from './FilmMapModal';
import { FilmPhoto } from './FilmPhoto';
import './FilmDetail.css';

interface Props {
    filmId: string;
    onBack: () => void;
}

const dateFormat = new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'long',
    timeZone: 'UTC'
});

export default function FilmDetail({ filmId, onBack }: Props) {
    const [mapOpen, setMapOpen] = useState(false);
    const { collection } = useContext(FilmContext);
    const film = collection.find(item => item._id === filmId);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="primary">
                    <IonButtons slot="start">
                        <IonButton onClick={onBack} aria-label="Înapoi la listă">
                            <IonIcon slot="icon-only" icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Detalii titlu</IonTitle>
                </IonToolbar>
                <ConnectionStatus />
            </IonHeader>
            <IonContent className="ion-padding">
                {film ? (
                    <article className="film-detail">
                        <header className="film-detail__header">
                            <p>{film.kind === 'serial' ? 'Serial' : 'Film'}</p>
                            <h1>{film.title}</h1>
                            <IonBadge color={film.watched ? 'success' : 'warning'}>
                                {film.watched ? 'Vizionat' : 'De urmărit'}
                            </IonBadge>
                        </header>
                        <FilmPhoto film={film} className="film-photo-large" />
                        <dl className="film-detail__facts">
                            <div>
                                <dt>Notă</dt>
                                <dd>{film.rating} / 5</dd>
                            </div>
                            <div>
                                <dt>Data lansării</dt>
                                <dd><time dateTime={film.releaseDate}>{dateFormat.format(new Date(film.releaseDate))}</time></dd>
                            </div>
                        </dl>
                        {film.location && <div className="ion-padding-horizontal ion-padding-bottom">
                            <IonButton fill="outline" onClick={() => setMapOpen(true)}>Vezi pe hartă</IonButton>
                        </div>}
                    </article>
                ) : (
                    <p role="status">Titlul nu mai este disponibil în colecție.</p>
                )}
            </IonContent>
            {mapOpen && film?.location && <FilmMapModal location={film.location} onClose={() => setMapOpen(false)} />}
        </IonPage>
    );
}
