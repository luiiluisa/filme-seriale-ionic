import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Navigate, Route } from 'react-router-dom';

import Home from './pages/Home';
import Edit from './pages/Edit';
import Detail from './pages/Detail';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

setupIonicReact();

const App: React.FC = () => (
    <IonApp>
        <IonReactRouter>
            <IonRouterOutlet>
                <Route path="/home" element={<Home />} />
                <Route path="/filme/:id" element={<Detail />} />
                <Route path="/edit" element={<Edit />} />
                <Route path="/edit/:id" element={<Edit />} />
                <Route path="/" element={<Navigate replace to="/home" />} />
            </IonRouterOutlet>
        </IonReactRouter>
    </IonApp>
);

export default App;
