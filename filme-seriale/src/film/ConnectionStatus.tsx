import { useContext } from 'react';
import { IonBadge, IonToolbar } from '@ionic/react';
import { AuthContext } from '../auth/AuthProvider';
import { FilmContext } from './FilmProvider';

export function ConnectionStatus() {
    const { username } = useContext(AuthContext);
    const { online, pendingCount, syncError } = useContext(FilmContext);

    return (
        <IonToolbar>
            <div role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '4px 16px' }}>
                <IonBadge color={online ? 'success' : 'warning'}>{online ? 'Online' : 'Offline'}</IonBadge>
                {username && <span>Cont: <strong>{username}</strong></span>}
                {pendingCount > 0 && <span>{pendingCount} {pendingCount === 1 ? 'modificare netrimisă' : 'modificări netrimise'}</span>}
                {syncError && <span>Sincronizare: {syncError}</span>}
            </div>
        </IonToolbar>
    );
}
