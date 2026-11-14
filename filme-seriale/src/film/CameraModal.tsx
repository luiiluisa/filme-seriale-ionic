import { useEffect, useRef, useState } from 'react';
import { IonButton, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { compressPhoto } from './photoStorage';

function cameraError(error: unknown) {
    if (error instanceof DOMException) {
        switch (error.name) {
            case 'NotAllowedError':
            case 'SecurityError':
                return 'Accesul la cameră este blocat. Permite camera pentru localhost în Edge și verifică setările de confidențialitate din Windows.';
            case 'NotFoundError':
            case 'OverconstrainedError':
                return 'Edge nu găsește o cameră disponibilă. Verifică dacă este activată și dacă apare în aplicația Cameră din Windows.';
            case 'NotReadableError':
            case 'AbortError':
                return 'Camera a fost găsită, dar nu a pornit. Închide aplicațiile care o pot folosi și încearcă din nou.';
        }
    }
    return 'Camera nu a putut fi pornită. Verifică dacă funcționează în aplicația Cameră din Windows.';
}

interface CameraProps {
    onCapture: (photo: Blob) => Promise<void>;
    onClose: () => void;
}

export function CameraModal({ onCapture, onClose }: CameraProps) {
    const modal = useRef<HTMLIonModalElement>(null);
    return (
        <IonModal ref={modal} isOpen onDidDismiss={onClose} aria-label="Cameră">
            <CameraContent onCapture={onCapture} onClose={() => { void modal.current?.dismiss(); }} />
        </IonModal>
    );
}

function CameraContent({ onCapture, onClose }: CameraProps) {
    const video = useRef<HTMLVideoElement>(null);
    const [ready, setReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        let stream: MediaStream | undefined;
        async function start() {
            try {
                const devices = navigator.mediaDevices;
                if (!devices?.getUserMedia) {
                    if (active) setError('Camera necesită un browser compatibil și o adresă localhost sau HTTPS.');
                    return;
                }
                try {
                    stream = await devices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
                } catch (error) {
                    if (!active || !(error instanceof DOMException) || !['NotFoundError', 'OverconstrainedError'].includes(error.name)) throw error;
                    stream = await devices.getUserMedia({ audio: false, video: true });
                }
                if (active && video.current) video.current.srcObject = stream;
                else stream.getTracks().forEach(track => track.stop());
            } catch (error) {
                if (active) setError(cameraError(error));
            }
        }
        void start();
        return () => {
            active = false;
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    async function capture() {
        const frame = video.current;
        if (!frame || !frame.videoWidth) return;
        setSaving(true);
        setError('');
        try {
            await onCapture(await compressPhoto(frame, frame.videoWidth, frame.videoHeight));
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fotografia nu a putut fi salvată.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <IonHeader><IonToolbar><IonTitle>Cameră</IonTitle></IonToolbar></IonHeader>
            <IonContent className="ion-padding">
                <video className="film-camera" ref={video} autoPlay playsInline muted onCanPlay={() => setReady(true)} />
                {error && <p role="alert">{error}</p>}
                <IonButton disabled={!ready || saving} onClick={() => void capture()}>Capturează</IonButton>
                <IonButton fill="clear" disabled={saving} onClick={onClose}>Închide camera</IonButton>
            </IonContent>
        </>
    );
}
