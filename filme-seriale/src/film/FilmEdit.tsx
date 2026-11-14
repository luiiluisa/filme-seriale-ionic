import React, {
    useContext,
    useRef,
    useState
} from 'react';

import {
    IonPage,
    IonHeader,
    IonIcon,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonText,
    IonSpinner
} from '@ionic/react';
import { arrowBack } from 'ionicons/icons';

import { FilmContext } from './FilmProvider';
import { ConnectionStatus } from './ConnectionStatus';
import type { FilmLocation, FilmProps } from './FilmProps';
import { AuthContext } from '../auth/AuthProvider';
import { CameraModal } from './CameraModal';
import { FilmMapModal } from './FilmMapModal';
import { FilmPhoto } from './FilmPhoto';
import { compressPhoto, writePhoto } from './photoStorage';

interface Props {
    filmId?: string;
    onBack: () => void;
}

function isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] =
        value.split('-').map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day)
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

const FilmEdit: React.FC<Props> = ({
                                             filmId,
                                             onBack
                                         }) => {
    const {
        collection,
        saving,
        saveFilm
    } = useContext(FilmContext);

    const film = collection.find(
        item => item._id === filmId
    );

    const [title, setTitle] = useState(film?.title ?? '');
    const [kind, setKind] = useState<FilmProps['kind']>(film?.kind ?? 'film');
    const [rating, setRating] = useState(String(film?.rating ?? 3));
    const [releaseDate, setReleaseDate] = useState(film?.releaseDate ?? '');
    const [watched, setWatched] = useState(film?.watched ?? false);
    const { userId } = useContext(AuthContext);
    const [location, setLocation] = useState<FilmLocation | undefined>(film?.location);
    const [photoId, setPhotoId] = useState(film?.photoId);
    const [photoPending, setPhotoPending] = useState(film?.photoPending ?? false);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [mapOpen, setMapOpen] = useState(false);
    const [importingPhoto, setImportingPhoto] = useState(false);
    const photoInput = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');

    async function savePhoto(blob: Blob) {
        const id = crypto.randomUUID();
        await writePhoto(userId, id, blob);
        setError('');
        setPhotoId(id);
        setPhotoPending(true);
    }

    async function importPhoto(file: File) {
        setImportingPhoto(true);
        try {
            const bitmap = await createImageBitmap(file);
            try {
                await savePhoto(await compressPhoto(bitmap, bitmap.width, bitmap.height));
            } finally {
                bitmap.close();
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Fotografia nu a putut fi importată.');
        } finally {
            setImportingPhoto(false);
        }
    }

    const handleSave = async () => {
        setError('');

        const numericRating = Number(rating);

        if (!title.trim()) {
            setError('Titlul este obligatoriu.');
            return;
        }

        if (
            rating.trim() === '' ||
            !Number.isFinite(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            setError('Nota trebuie să fie între 1 și 5.');
            return;
        }

        if (!isValidDate(releaseDate)) {
            setError('Alege o dată de lansare validă.');
            return;
        }

        const editedFilm: FilmProps = {
            ...film,
            title: title.trim(),
            kind,
            rating: numericRating,
            releaseDate,
            watched,
            location,
            photoId,
            photoPending
        };

        try {
            await saveFilm(editedFilm);
            onBack();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Titlul nu a putut fi salvat.'
            );
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="primary">
                    <IonButtons slot="start">
                        <IonButton onClick={onBack} aria-label="Înapoi la listă">
                            <IonIcon slot="icon-only" icon={arrowBack} />
                        </IonButton>
                    </IonButtons>

                    <IonTitle>
                        {filmId
                            ? 'Editează titlul'
                            : 'Adaugă un titlu'}
                    </IonTitle>

                    <IonButtons slot="end">
                        <IonButton
                            disabled={saving || importingPhoto || (!!filmId && !film)}
                            onClick={handleSave}
                        >
                            Salvează
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
                <ConnectionStatus />
            </IonHeader>

            <IonContent className="ion-padding">
                <IonItem>
                    <IonInput
                        label="Titlu"
                        labelPlacement="stacked"
                        placeholder="De exemplu, Interstellar"
                        value={title}
                        onIonInput={e =>
                            setTitle(e.detail.value || '')
                        }
                    />
                </IonItem>

                <IonItem>
                    <IonSelect
                        label="Tip"
                        labelPlacement="stacked"
                        value={kind}
                        onIonChange={event => setKind(event.detail.value)}
                    >
                        <IonSelectOption value="film">Film</IonSelectOption>
                        <IonSelectOption value="serial">Serial</IonSelectOption>
                    </IonSelect>
                </IonItem>

                <IonItem>
                    <IonInput
                        label="Notă (1–5)"
                        labelPlacement="stacked"
                        type="number"
                        min="1"
                        max="5"
                        value={rating}
                        onIonInput={e =>
                            setRating(e.detail.value || '')
                        }
                    />
                </IonItem>

                <IonItem>
                    <label
                        htmlFor="release-date"
                        style={{ marginRight: 16 }}
                    >
                        Data lansării
                    </label>

                    <input
                        id="release-date"
                        type="date"
                        value={releaseDate}
                        onChange={e =>
                            setReleaseDate(e.target.value)
                        }
                        style={{
                            flex: 1,
                            padding: 12,
                            color: 'inherit',
                            background: 'transparent'
                        }}
                    />
                </IonItem>

                <IonItem>
                    <IonToggle
                        checked={watched}
                        onIonChange={e =>
                            setWatched(e.detail.checked)
                        }
                    >
                        Vizionat
                    </IonToggle>
                </IonItem>

                <section className="film-media-fields" aria-label="Fotografie și locație">
                    <FilmPhoto film={{ _id: filmId, title, photoId, photoPending }} className="film-photo-large" />
                    <IonButton fill="outline" disabled={saving || importingPhoto} onClick={() => setCameraOpen(true)}>
                        Fă o fotografie
                    </IonButton>
                    <IonButton fill="clear" disabled={saving || importingPhoto} onClick={() => photoInput.current?.click()}>
                        Alege o fotografie
                    </IonButton>
                    <input ref={photoInput} hidden type="file" accept="image/*" onChange={event => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = '';
                        if (file) void importPhoto(file);
                    }} />
                    <div>
                        <IonButton fill="outline" disabled={saving} onClick={() => setMapOpen(true)}>
                            {location ? 'Schimbă locația' : 'Alege locația'}
                        </IonButton>
                        {location && <p className="film-coordinates">
                            Latitudine {location.latitude.toFixed(5)} · Longitudine {location.longitude.toFixed(5)}
                        </p>}
                    </div>
                </section>

                {error && (
                    <IonText color="danger">
                        <p>{error}</p>
                    </IonText>
                )}

                {saving && (
                    <div style={{ padding: 16 }}>
                        <IonSpinner />
                        <p>Se salvează…</p>
                    </div>
                )}
            </IonContent>
            {cameraOpen && <CameraModal onCapture={savePhoto} onClose={() => setCameraOpen(false)} />}
            {mapOpen && <FilmMapModal location={location} onSelect={setLocation} onClose={() => setMapOpen(false)} />}
        </IonPage>
    );
};

export default FilmEdit;
