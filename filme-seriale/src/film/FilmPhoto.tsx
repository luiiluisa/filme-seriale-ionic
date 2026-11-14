import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../auth/AuthProvider';
import { FilmContext } from './FilmProvider';
import { getFilmPhoto } from './filmApi';
import { readPhoto, writePhoto } from './photoStorage';
import type { FilmProps } from './FilmProps';
import './FilmMedia.css';

export function FilmPhoto({ film, className }: {
    film: Pick<FilmProps, '_id' | 'title' | 'photoId' | 'photoPending'>;
    className?: string;
}) {
    const { token, userId } = useContext(AuthContext);
    const { online } = useContext(FilmContext);
    const { _id: id, title, photoId, photoPending } = film;
    const [image, setImage] = useState<{ photoId: string; url: string }>();

    useEffect(() => {
        if (!photoId) return;
        const controller = new AbortController();
        let url: string | undefined;

        async function load(key: string) {
            let blob: Blob | null = await readPhoto(userId, key).catch(() => null);
            if (!blob && id && !photoPending && online) {
                blob = await getFilmPhoto(token, id, key, controller.signal);
                if (!controller.signal.aborted) await writePhoto(userId, key, blob).catch(() => {});
            }
            if (!blob || controller.signal.aborted) return;
            url = URL.createObjectURL(blob);
            setImage({ photoId: key, url });
        }

        void load(photoId).catch(() => {});
        return () => {
            controller.abort();
            if (url) URL.revokeObjectURL(url);
        };
    }, [id, online, photoId, photoPending, token, userId]);

    if (!photoId) return null;
    if (!image || image.photoId !== photoId) {
        return <span className={className}>Fotografie indisponibilă local</span>;
    }

    return <img className={className} src={image.url} alt={'Fotografie pentru ' + title} />;
}
