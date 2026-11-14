import React, { useContext, useState } from 'react';

import {
    IonApp,
    setupIonicReact
} from '@ionic/react';

import {
    AuthProvider,
    AuthContext
} from './auth/AuthProvider';

import Login from './auth/Login';

import FilmList from './film/FilmList';
import FilmEdit from './film/FilmEdit';
import FilmDetail from './film/FilmDetail';

import {
    FilmProvider
} from './film/FilmProvider';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './theme/variables.css';

setupIonicReact();

type CollectionPage =
    | { name: 'list' }
    | { name: 'detail'; id: string }
    | { name: 'edit'; id?: string };

const CollectionPages: React.FC = () => {
    const [page, setPage] = useState<CollectionPage>({ name: 'list' });
    const showList = () => setPage({ name: 'list' });

    if (page.name === 'detail') {
        return <FilmDetail filmId={page.id} onBack={showList} />;
    }

    if (page.name === 'edit') {
        return <FilmEdit filmId={page.id} onBack={showList} />;
    }

    return (
        <FilmList
            onAdd={() => setPage({ name: 'edit' })}
            onDetail={id => setPage({ name: 'detail', id })}
            onEdit={id => setPage({ name: 'edit', id })}
        />
    );
};

const AuthenticatedApp: React.FC = () => {
    const { token } = useContext(AuthContext);

    return (
        <FilmProvider key={token}>
            <CollectionPages />
        </FilmProvider>
    );
};

const AppContent: React.FC = () => {
    const { isAuthenticated } = useContext(AuthContext);

    if (!isAuthenticated) {
        return <Login />;
    }

    return <AuthenticatedApp />;
};

const App: React.FC = () => (
    <IonApp>
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    </IonApp>
);

export default App;
