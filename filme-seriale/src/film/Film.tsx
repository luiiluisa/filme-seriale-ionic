import React from 'react';

import {
    IonItem,
    IonLabel,
    IonBadge,
    IonButton
} from '@ionic/react';

import { FilmProps } from './FilmProps';
import { FilmPhoto } from './FilmPhoto';

interface Props {
    film: FilmProps;
    onDetail: () => void;
    onEdit: () => void;
    onDelete: () => void;
    deleting: boolean;
    pending: boolean;
}

const Film: React.FC<Props> = ({ film, onDetail, onEdit, onDelete, deleting, pending }) => {
    return (
        <div className="film-row">
            <IonItem button detail onClick={onDetail} style={{ flex: 1, minWidth: 0 }}>
                {film.photoId && <div slot="start"><FilmPhoto film={film} className="film-thumbnail" /></div>}
                <IonLabel>
                    <h2>{film.title}</h2>

                    <p>
                        {film.kind === 'serial' ? 'Serial' : 'Film'} · Notă: {film.rating}/5
                        {' | '}
                        {film.releaseDate}
                    </p>
                    {pending && <IonBadge color="warning">Netrimis</IonBadge>}
                </IonLabel>

                <IonBadge
                    color={
                        film.watched
                            ? 'success'
                            : 'warning'
                    }
                >
                    {film.watched
                        ? 'Vizionat'
                        : 'De urmărit'}
                </IonBadge>
            </IonItem>
            <div className="film-row-actions">
                <IonButton
                    fill="outline"
                    size="small"
                    disabled={deleting}
                    aria-label={"Modifică " + film.title}
                    onClick={onEdit}
                >
                    Modifică
                </IonButton>
                <IonButton
                    color="danger"
                    fill="outline"
                    size="small"
                    disabled={deleting}
                    aria-label={"Șterge " + film.title}
                    onClick={onDelete}
                >
                    Șterge
                </IonButton>
            </div>
        </div>
    );
};

export default Film;
