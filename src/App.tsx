import { useEffect, useState } from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Edit from './pages/Edit';
import Detail from './pages/Detail';
import Login from './pages/Login';
import { AUTH, CHANGE, getSession, pendingCount, sincronizeaza } from './services/api';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
setupIonicReact();
export default function App() {
 const [session, setSession] = useState(getSession);
 const [online, setOnline] = useState(navigator.onLine);
 const [pending, setPending] = useState(pendingCount);
 const [error, setError] = useState('');
 useEffect(() => {
  const auth = () => { setSession(getSession()); setPending(pendingCount()); };
  window.addEventListener(AUTH, auth);
  const timer = setInterval(auth, 30000);
  return () => { window.removeEventListener(AUTH, auth); clearInterval(timer); };
 }, []);
 useEffect(() => {
  const update = () => setPending(pendingCount());
  const sync = () => { setOnline(navigator.onLine); if (getSession()) void sincronizeaza().then(() => setError('')).catch(e => setError(e.message)); };
  window.addEventListener(CHANGE, update); window.addEventListener('online', sync); window.addEventListener('offline', sync);
  const timer = setInterval(sync, 15000); sync();
  return () => { clearInterval(timer); window.removeEventListener(CHANGE, update); window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
 }, [session?.token]);
 return <IonApp><div role="status" style={{ padding: '8px 16px', background: online ? '#e4f5ec' : '#fff1cf', color: '#172c23', zIndex: 100, flexShrink: 0 }}>{online ? '● Online' : '● Offline'}{pending > 0 && ` · ${pending} modificări salvate local, netrimise la server`}{error && ` · ${error}`}</div><div style={{ position: 'relative', flex: 1 }}><BrowserRouter><Routes>{session ? <><Route path="/home" element={<Home />} /><Route path="/filme/:id" element={<Detail />} /><Route path="/edit" element={<Edit />} /><Route path="/edit/:id" element={<Edit />} /><Route path="*" element={<Navigate replace to="/home" />} /></> : <><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate replace to="/login" />} /></>}</Routes></BrowserRouter></div></IonApp>;
}
