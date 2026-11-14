export interface FilmLocation {
    latitude: number;
    longitude: number;
}

export interface FilmProps {
    _id?: string;
    title: string;
    kind: 'film' | 'serial';
    rating: number;
    releaseDate: string;
    watched: boolean;
    userId?: string;
    location?: FilmLocation;
    photoId?: string;
    photoPending?: boolean;
}
