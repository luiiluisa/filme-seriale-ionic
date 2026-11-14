const BASE_URL = 'http://localhost:3001/api/auth';

async function authenticate(
    endpoint: string,
    username: string,
    password: string
): Promise<{ token: string }> {
    const response = await fetch(
        `${BASE_URL}/${endpoint}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || 'Authentication failed'
        );
    }

    return data;
}

export const loginApi = (
    username: string,
    password: string
) => authenticate('login', username, password);

export const signupApi = (
    username: string,
    password: string
) => authenticate('signup', username, password);
