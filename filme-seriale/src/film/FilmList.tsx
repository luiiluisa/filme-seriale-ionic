import React, { useContext, useEffect, useRef, useState } from 'react';

import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonText,
    IonSpinner,
    IonButtons,
    IonButton
} from '@ionic/react';

import { add } from 'ionicons/icons';

import Film from './Film';
import { ConnectionStatus } from './ConnectionStatus';
import type { FilmProps } from './FilmProps';
import { FilmContext } from './FilmProvider';
import { AuthContext } from '../auth/AuthProvider';

interface Props {
    onAdd: () => void;
    onDetail: (id: string) => void;
    onEdit: (id: string) => void;
}

const FilmList: React.FC<Props> = ({ onAdd, onDetail, onEdit }) => {
    const [deleteError, setDeleteError] = useState('');
    const {
        films,
        fetching,
        fetchingError,
        saving,
        filters,
        setFilters,
        pendingIds,
        hasMore,
        loadMore,
        removeFilm
    } = useContext(FilmContext);

    const scrolling = useRef<HTMLIonInfiniteScrollElement | null>(null);
    useEffect(() => {
        if (!fetching && scrolling.current) {
            void scrolling.current.complete();
            scrolling.current = null;
        }
    }, [fetching, films]);

    const { logout } = useContext(AuthContext);

    async function handleDelete(film: FilmProps) {
        if (!film._id || !window.confirm("Ștergi „" + film.title + "” din colecție?")) return;
        setDeleteError("");
        try {
            await removeFilm(film._id);
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : "Titlul nu a putut fi șters.");
        }
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="primary">
                    <IonTitle>Filme și seriale</IonTitle>

                    <IonButtons slot="end">
                        <IonButton onClick={logout}>
                            Deconectare
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
                <ConnectionStatus />
            </IonHeader>

            <IonContent>
                <IonSearchbar
                    placeholder="Caută după titlu"
                    aria-label="Caută după titlu"
                    debounce={250}
                    value={filters.q}
                    onIonInput={event => setFilters({ ...filters, q: event.detail.value ?? '' })}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: "0 16px" }}>
                    <IonSelect label="Tip" value={filters.kind} onIonChange={event => setFilters({ ...filters, kind: event.detail.value })}>
                        <IonSelectOption value="">Toate</IonSelectOption>
                        <IonSelectOption value="film">Filme</IonSelectOption>
                        <IonSelectOption value="serial">Seriale</IonSelectOption>
                    </IonSelect>
                    <IonSelect label="Vizionare" value={filters.watched} onIonChange={event => setFilters({ ...filters, watched: event.detail.value })}>
                        <IonSelectOption value="">Toate</IonSelectOption>
                        <IonSelectOption value="true">Vizionate</IonSelectOption>
                        <IonSelectOption value="false">De urmărit</IonSelectOption>
                    </IonSelect>
                </div>
                {fetching && (
                    <div style={{
                        textAlign: 'center',
                        padding: 20
                    }}>
                        <IonSpinner />
                        <p>Se încarcă lista…</p>
                    </div>
                )}

                {fetchingError && (
                    <IonText color="danger">
                        <p style={{ padding: 16 }}>
                            {fetchingError}
                        </p>
                    </IonText>
                )}

                {deleteError && (
                    <IonText color="danger">
                        <p role="alert" style={{ padding: 16 }}>{deleteError}</p>
                    </IonText>
                )}

                <IonList>
                    {films.map(film => (
                        <Film
                            key={film._id}
                            film={film}
                            pending={pendingIds.has(film._id ?? '')}
                            deleting={saving}
                            onDelete={() => void handleDelete(film)}
                            onDetail={() => {
                                if (film._id) onDetail(film._id);
                            }}
                            onEdit={() => {
                                if (film._id) {
                                    onEdit(film._id);
                                }
                            }}
                        />
                    ))}
                </IonList>

                {hasMore && (
                    <IonButton fill="clear" disabled={fetching} onClick={loadMore}>Încarcă mai multe</IonButton>
                )}
                <IonInfiniteScroll disabled={!hasMore} onIonInfinite={event => {
                    if (fetching || !hasMore) {
                        void event.target.complete();
                        return;
                    }
                    scrolling.current = event.target;
                    loadMore();
                }}>
                    <IonInfiniteScrollContent loadingText="Se încarcă…" />
                </IonInfiniteScroll>

                {!fetching &&
                    !fetchingError &&
                    films.length === 0 && (
                        <p style={{
                            textAlign: 'center',
                            padding: 24
                        }}>
                            {filters.q || filters.kind || filters.watched
                                ? 'Niciun titlu nu corespunde căutării.'
                                : 'Colecția este goală. Adaugă primul film sau serial.'}
                        </p>
                    )}

                <IonFab
                    vertical="bottom"
                    horizontal="end"
                    slot="fixed"
                >
                    <IonFabButton onClick={onAdd} aria-label="Adaugă un titlu">
                        <IonIcon icon={add} />
                    </IonFabButton>
                </IonFab>
            </IonContent>
        </IonPage>
    );
};

export default FilmList;
