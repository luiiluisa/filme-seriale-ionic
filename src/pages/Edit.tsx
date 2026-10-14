import { useEffect, useState, type FC } from 'react';
import {
    IonButton,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
} from '@ionic/react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    adaugaFilm,
    FilmNou,
    modificaFilm,
    obtineFilm,
    TipMedia,
} from '../services/api';

const Edit: FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [titlu, setTitlu] = useState('');
    const [tip, setTip] = useState<TipMedia>('film');
    const [gen, setGen] = useState('');
    const [an, setAn] = useState('');
    const [vazut, setVazut] = useState(false);
    const [eroare, setEroare] = useState('');

    useEffect(() => {
        if (!id) return;

        obtineFilm(Number(id))
            .then((film) => {
                setTitlu(film.titlu);
                setTip(film.tip);
                setGen(film.gen);
                setAn(String(film.an));
                setVazut(film.vazut);
            })
            .catch(() => setEroare('Nu am putut încărca elementul.'));
    }, [id]);

    async function salveaza() {
        if (!titlu.trim() || !gen.trim() || !an.trim()) {
            setEroare('Completează titlul, genul și anul.');
            return;
        }

        const film: FilmNou = {
            titlu: titlu.trim(),
            tip,
            gen: gen.trim(),
            an: Number(an),
            vazut,
        };

        try {
            if (id) {
                await modificaFilm(Number(id), film);
            } else {
                await adaugaFilm(film);
            }

            navigate('/home', { replace: true });
        } catch {
            setEroare('Nu am putut salva. Verifică dacă serverul rulează.');
        }
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>{id ? 'Modifică' : 'Adaugă'}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <IonItem>
                    <IonInput
                        label="Titlu"
                        labelPlacement="stacked"
                        value={titlu}
                        onIonInput={(e) => setTitlu(e.detail.value ?? '')}
                    />
                </IonItem>

                <IonItem>
                    <IonSelect
                        label="Tip"
                        labelPlacement="stacked"
                        value={tip}
                        onIonChange={(e) => setTip(e.detail.value as TipMedia)}
                    >
                        <IonSelectOption value="film">Film</IonSelectOption>
                        <IonSelectOption value="serial">Serial</IonSelectOption>
                    </IonSelect>
                </IonItem>

                <IonItem>
                    <IonInput
                        label="Gen"
                        labelPlacement="stacked"
                        value={gen}
                        onIonInput={(e) => setGen(e.detail.value ?? '')}
                    />
                </IonItem>

                <IonItem>
                    <IonInput
                        label="An"
                        labelPlacement="stacked"
                        type="number"
                        value={an}
                        onIonInput={(e) => setAn(e.detail.value ?? '')}
                    />
                </IonItem>

                <IonItem>
                    <IonCheckbox
                        checked={vazut}
                        onIonChange={(e) => setVazut(e.detail.checked)}
                    />
                    <IonLabel className="ion-padding-start">Văzut</IonLabel>
                </IonItem>

                {eroare && <p>{eroare}</p>}

                <IonButton expand="block" onClick={() => void salveaza()}>
                    Salvează
                </IonButton>

                <IonButton
                    expand="block"
                    fill="outline"
                    onClick={() => navigate(-1)}
                >
                    Înapoi
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default Edit;