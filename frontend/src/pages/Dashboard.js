import React, { useEffect, useState } from 'react';

const Dashboard = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    return (
        <div style={styles.container}>
            <h1>Dashboard</h1>
            {user && (
                <div style={styles.welcome}>
                    <h2>Welcome, {user.fullName}!</h2>
                    <p>Role: {user.role}</p>
                    {user.stations && user.stations.length > 0 && (
                        <div>
                            <h3>Your Stations:</h3>
                            <ul>
                                {user.stations.map(s => (
                                    <li key={s.id}>{s.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px'
    },
    welcome: {
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
    }
};

export default Dashboard;
