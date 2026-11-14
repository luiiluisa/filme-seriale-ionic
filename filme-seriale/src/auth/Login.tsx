import React, {
    useContext,
    useState
} from 'react';

import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonSpinner
} from '@ionic/react';

import { AuthContext } from './AuthProvider';

const Login: React.FC = () => {
    const {
        login,
        signup,
        isAuthenticating,
        authenticationError
    } = useContext(AuthContext);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (createAccount: boolean) => {
        try {
            if (createAccount) {
                await signup(username.trim(), password);
            } else {
                await login(username.trim(), password);
            }
        } catch {
            // Error displayed by AuthProvider
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="primary">
                    <IonTitle>Filme și seriale</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <div style={{
                    maxWidth: 400,
                    margin: '60px auto'
                }}>
                    <h1>Autentificare</h1>

                    <p>
                        Organizează filmele și serialele pe care vrei să le urmărești.
                    </p>

                    <IonItem>
                        <IonInput
                            label="Utilizator"
                            labelPlacement="stacked"
                            value={username}
                            onIonInput={e =>
                                setUsername(e.detail.value || '')
                            }
                        />
                    </IonItem>

                    <IonItem>
                        <IonInput
                            label="Parolă"
                            labelPlacement="stacked"
                            type="password"
                            value={password}
                            onIonInput={e =>
                                setPassword(e.detail.value || '')
                            }
                        />
                    </IonItem>

                    {authenticationError && (
                        <IonText color="danger">
                            <p>{authenticationError}</p>
                        </IonText>
                    )}

                    {isAuthenticating && <IonSpinner />}

                    <IonButton
                        expand="block"
                        disabled={
                            isAuthenticating ||
                            !username.trim() ||
                            !password
                        }
                        onClick={() => handleSubmit(false)}
                    >
                        Intră în cont
                    </IonButton>

                    <IonButton
                        expand="block"
                        fill="outline"
                        disabled={
                            isAuthenticating ||
                            !username.trim() ||
                            !password
                        }
                        onClick={() => handleSubmit(true)}
                    >
                        Creează cont
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Login;
