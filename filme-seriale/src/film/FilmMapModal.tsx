import { useEffect, useRef, useState } from 'react';
import { createAnimation, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { closeOutline, locateOutline } from 'ionicons/icons';
import { circleMarker, map, tileLayer } from 'leaflet';
import type { CircleMarker, Map as LeafletMap } from 'leaflet';
import type { FilmLocation } from './FilmProps';
import 'leaflet/dist/leaflet.css';
import './FilmMedia.css';

function modalAnimation(base: HTMLElement, leaving = false) {
    const root = base.shadowRoot ?? base;
    const panel = root.querySelector('.modal-wrapper');
    const backdrop = root.querySelector('ion-backdrop');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = createAnimation().duration(reduced ? 0 : leaving ? 330 : 540)
        .easing(leaving ? 'ease-in' : 'cubic-bezier(.2, .75, .2, 1)');

    if (panel) animation.addAnimation(createAnimation().addElement(panel)
        .fromTo('transform', leaving ? 'translateX(0)' : 'translateX(65vw)',
            leaving ? 'translateX(65vw)' : 'translateX(0)')
        .fromTo('opacity', leaving ? 1 : .15, leaving ? .15 : 1));
    if (backdrop) animation.addAnimation(createAnimation().addElement(backdrop)
        .fromTo('opacity', leaving ? 0.36 : 0, leaving ? 0 : 0.36));

    return animation;
}

const enterMap = (base: HTMLElement) => modalAnimation(base);
const leaveMap = (base: HTMLElement) => modalAnimation(base, true);
const defaultCenter: FilmLocation = { latitude: 46.7712, longitude: 23.6236 };

interface MapProps {
    location?: FilmLocation;
    onSelect?: (location: FilmLocation) => void;
    onClose: () => void;
}

export function FilmMapModal({ location, onSelect, onClose }: MapProps) {
    const modal = useRef<HTMLIonModalElement>(null);
    const dismiss = () => { void modal.current?.dismiss(); };
    return (
        <IonModal ref={modal} className="film-map-modal" isOpen onDidDismiss={onClose} enterAnimation={enterMap} leaveAnimation={leaveMap} aria-label="Harta titlului">
            <MapContent location={location} onClose={dismiss} onSelect={onSelect && (point => { onSelect(point); dismiss(); })} />
        </IonModal>
    );
}

function MapContent({ location, onSelect, onClose }: MapProps) {
    const host = useRef<HTMLDivElement>(null);
    const instance = useRef<LeafletMap>(null);
    const marker = useRef<CircleMarker>(null);
    const initial = useRef(location);
    const [point, setPoint] = useState(location);
    const [tileError, setTileError] = useState(false);
    const [message, setMessage] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(false);
    const editable = Boolean(onSelect);

    useEffect(() => {
        if (!host.current) return;
        const center = initial.current ?? defaultCenter;
        const current = map(host.current).setView([center.latitude, center.longitude], 13);
        instance.current = current;

        const tiles = tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(current);
        tiles.on('tileerror', () => setTileError(true));
        if (editable) {
            current.on('click', event => {
                const { lat, lng } = event.latlng.wrap();
                setPoint({ latitude: lat, longitude: lng });
            });
        }

        const resize = new ResizeObserver(() => current.invalidateSize());
        resize.observe(host.current);
        return () => {
            resize.disconnect();
            current.remove();
            instance.current = null;
            marker.current = null;
        };
    }, [editable]);

    useEffect(() => {
        const current = instance.current;
        if (!current || !point) return;
        const position: [number, number] = [point.latitude, point.longitude];
        if (marker.current) marker.current.setLatLng(position);
        else marker.current = circleMarker(position, {
            radius: 10, color: '#fff', weight: 3, fillColor: '#174ea6', fillOpacity: 1,
            className: 'film-map-pin'
        }).addTo(current);
    }, [point]);

    function locate() {
        if (!navigator.geolocation) {
            setMessage('Localizarea nu este disponibilă.');
            return;
        }
        setLoadingLocation(true);
        setMessage('');
        navigator.geolocation.getCurrentPosition(({ coords }) => {
            if (!instance.current) return;
            instance.current.setView([coords.latitude, coords.longitude], 16, { animate: false });
            setMessage('Harta este centrată pe poziția ta.');
            setLoadingLocation(false);
        }, () => {
            if (!instance.current) return;
            setMessage('Poziția nu a putut fi obținută. Poți selecta manual un punct pe hartă.');
            setLoadingLocation(false);
        }, { timeout: 10000 });
    }

    return (
        <>
            <IonHeader className="ion-no-border">
                <IonToolbar>
                    <IonTitle>{editable ? 'Alege locația' : 'Locația salvată'}</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={onClose} aria-label="Închide fereastra">
                            <IonIcon slot="icon-only" icon={closeOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="film-map-content" scrollY={false}>
                <div className="film-map-layout">
                    {editable && <p className="film-map-hint">Apasă pe hartă pentru a marca locul asociat titlului.</p>}
                    <div ref={host} className="film-map" aria-label="Hartă interactivă" />
                    {(tileError || message) && <p className="film-map-hint" role="status">
                        {message || 'Fundalul hărții necesită conexiune la internet.'}
                    </p>}
                </div>
            </IonContent>
            <IonFooter className="ion-no-border film-map-footer">
                <div className="film-map-summary">
                    <strong>{point ? 'Punct selectat' : 'Niciun punct selectat'}</strong>
                    {point && <span className="film-coordinates">
                        Latitudine {point.latitude.toFixed(5)} · Longitudine {point.longitude.toFixed(5)}
                    </span>}
                </div>
                <div className="film-map-actions">
                    {editable ? (
                        <>
                            <IonButton fill="outline" disabled={loadingLocation} onClick={locate}>
                                <IonIcon slot="start" icon={locateOutline} />
                                {loadingLocation ? 'Se localizează…' : 'Locația mea'}
                            </IonButton>
                            <IonButton disabled={!point} onClick={() => { if (point) onSelect?.(point); }}>
                                Folosește această locație
                            </IonButton>
                        </>
                    ) : <IonButton fill="outline" onClick={onClose}>Închide harta</IonButton>}
                </div>
            </IonFooter>
        </>
    );
}
