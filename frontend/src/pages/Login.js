import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(`${process.env.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed');

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Orange Inventory</h1>
                <form onSubmit={handleSubmit}>
                    {error && <div style={styles.error}>{error}</div>}
                    <div style={styles.field}>
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.field}>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                    <button type="submit" style={styles.button}>
                        Login
                    </button>
                </form>
                <div style={styles.demo}>
                    <p>Demo: admin@orange.com / Admin123!</p>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
        margin: 0
    },
    card: {
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '400px'
    },
    title: {
        textAlign: 'center',
        color: '#ff6b00',
        marginBottom: '30px'
    },
    field: {
        marginBottom: '20px'
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '16px',
        boxSizing: 'border-box'
    },
    button: {
        width: '100%',
        padding: '12px',
        background: '#ff6b00',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: 'pointer'
    },
    error: {
        color: 'red',
        marginBottom: '15px',
        padding: '10px',
        background: '#ffe6e6',
        borderRadius: '4px'
    },
    demo: {
        marginTop: '20px',
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
    }
};

export default Login;
