import { useState } from 'react';
import { IonButton, IonContent, IonHeader, IonInput, IonItem, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { login } from '../services/api';
export default function Login() {
 const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
 const [register, setRegister] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
 async function submit(e: React.FormEvent) {
  e.preventDefault(); setBusy(true); setError('');
  try { await login(username.trim(), password, register); }
  catch (err) { setError(err instanceof Error ? err.message : 'Server indisponibil. Verifică conexiunea.'); }
  finally { setBusy(false); }
 }
 return <IonPage><IonHeader><IonToolbar><IonTitle>Filme și seriale</IonTitle></IonToolbar></IonHeader><IonContent className="ion-padding"><form onSubmit={submit} style={{ maxWidth: 460, margin: '48px auto' }}><h1>{register ? 'Cont nou' : 'Autentificare'}</h1><p>Colecția ta de filme și seriale, disponibilă și offline.</p><IonItem><IonInput label="Utilizator" labelPlacement="stacked" autocomplete="username" value={username} onIonInput={e => setUsername(e.detail.value || '')} required /></IonItem><IonItem><IonInput label="Parolă" labelPlacement="stacked" type="password" autocomplete={register ? 'new-password' : 'current-password'} value={password} onIonInput={e => setPassword(e.detail.value || '')} required /></IonItem>{error && <p role="alert">{error}</p>}<IonButton type="submit" expand="block" disabled={busy}>{busy ? 'Se conectează…' : register ? 'Creează cont' : 'Intră în cont'}</IonButton><IonButton fill="clear" expand="block" onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Am deja cont' : 'Creează un cont'}</IonButton><p>Cont demonstrativ: <b>demo</b> / <b>demo123</b></p></form></IonContent></IonPage>;
}
