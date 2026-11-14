import React, {
    createContext,
    useCallback,
    useEffect,
    useState
} from 'react';

import { loginApi, signupApi } from './authApi';

interface AuthState {
    token: string;
    userId: string;
    username: string;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    authenticationError: string | null;
    login: (username: string, password: string) => Promise<void>;
    signup: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

function readToken(token: string): { _id: string; exp: number; username?: string } {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
}

function getStoredToken(): string {
    const token = localStorage.getItem('filme-seriale-token');

    if (!token) return '';

    try {
        const payload = readToken(token);

        if (
            typeof payload._id !== 'string' ||
            typeof payload.exp !== 'number' ||
            payload.exp * 1000 <= Date.now()
        ) {
            localStorage.removeItem('filme-seriale-token');
            return '';
        }

        return token;
    } catch {
        localStorage.removeItem('filme-seriale-token');
        return '';
    }
}

export const AuthContext = createContext<AuthState>({
    token: '',
    userId: '',
    username: '',
    isAuthenticated: false,
    isAuthenticating: false,
    authenticationError: null,
    login: async () => {},
    signup: async () => {},
    logout: () => {}
});

export const AuthProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [token, setToken] = useState(getStoredToken);
    const [isAuthenticating, setAuthenticating] = useState(false);
    const [authenticationError, setError] =
        useState<string | null>(null);

    const logout = useCallback(() => {
        localStorage.removeItem('filme-seriale-token');
        setToken('');
        setError(null);
    }, []);

    const claims = token ? readToken(token) : null;
    const expiresAt = claims ? claims.exp * 1000 : 0;
    useEffect(() => {
        if (!expiresAt) return;
        const timer = window.setTimeout(logout, Math.max(0, expiresAt - Date.now()));
        return () => window.clearTimeout(timer);
    }, [expiresAt, logout]);

    const authenticate = async (
        username: string,
        password: string,
        createAccount: boolean
    ) => {
        setAuthenticating(true);
        setError(null);

        try {
            const result = createAccount
                ? await signupApi(username, password)
                : await loginApi(username, password);

            localStorage.setItem(
                'filme-seriale-token',
                result.token
            );

            setToken(result.token);
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Authentication failed';

            setError(message);
            throw error;
        } finally {
            setAuthenticating(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                userId: claims?._id ?? '',
                username: claims?.username ?? '',
                isAuthenticated: Boolean(token),
                isAuthenticating,
                authenticationError,
                login: (username, password) =>
                    authenticate(username, password, false),
                signup: (username, password) =>
                    authenticate(username, password, true),
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
