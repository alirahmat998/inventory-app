import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';

const Layout = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!token || !userData) {
            navigate('/login');
            return;
        }
        setUser(JSON.parse(userData));
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div style={styles.layout}>
            <nav style={styles.nav}>
                <div style={styles.navLeft}>
                    <Link to="/" style={styles.brand}>⛽ Orange Inventory</Link>
                    <Link to="/" style={styles.navLink}>Dashboard</Link>
                    <Link to="/inventory" style={styles.navLink}>Inventory</Link>
                    <Link to="/transfers" style={styles.navLink}>Transfers</Link>
                </div>
                <div style={styles.navRight}>
                    <span style={styles.user}>{user?.fullName || 'User'}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
                </div>
            </nav>
            <main style={styles.main}>
                <Outlet />
            </main>
        </div>
    );
};

const styles = {
    layout: { minHeight: '100vh', background: '#f5f5f5' },
    nav: {
        background: '#1a1a2e',
        color: 'white',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '60px'
    },
    navLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
    brand: { color: '#ff6b00', fontSize: '20px', fontWeight: 'bold', textDecoration: 'none' },
    navLink: { color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: '4px' },
    navRight: { display: 'flex', alignItems: 'center', gap: '15px' },
    user: { color: '#aaa' },
    logoutBtn: {
        background: '#ff6b00',
        color: 'white',
        border: 'none',
        padding: '6px 16px',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    main: { padding: '20px' }
};

export default Layout;
