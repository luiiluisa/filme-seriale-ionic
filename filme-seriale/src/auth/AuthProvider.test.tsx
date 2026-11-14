import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { afterEach, expect, test } from 'vitest';
import { AuthContext, AuthProvider } from './AuthProvider';

const tokenKey = 'filme-seriale-token';

function Session() {
    const { userId, isAuthenticated, logout } = useContext(AuthContext);
    return isAuthenticated
        ? <button onClick={logout}>Deconectare {userId}</button>
        : <p>Autentificare</p>;
}

afterEach(() => {
    cleanup();
    localStorage.clear();
});

test('restores a valid stored session and clears it at logout', () => {
    const payload = btoa(JSON.stringify({ _id: 'admin1-id', exp: Math.floor(Date.now() / 1000) + 60 }));
    localStorage.setItem(tokenKey, 'header.' + payload + '.signature');
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Deconectare admin1-id' }));
    expect(screen.getByText('Autentificare')).toBeInTheDocument();
    expect(localStorage.getItem(tokenKey)).toBeNull();
});

test('discards an expired stored session', () => {
    const payload = btoa(JSON.stringify({ _id: 'admin1-id', exp: 1 }));
    localStorage.setItem(tokenKey, 'header.' + payload + '.signature');
    render(<AuthProvider><Session /></AuthProvider>);
    expect(screen.getByText('Autentificare')).toBeInTheDocument();
    expect(localStorage.getItem(tokenKey)).toBeNull();
});
