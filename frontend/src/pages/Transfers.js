import React, { useState, useEffect } from 'react';

const Transfers = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransfers();
    }, []);

    const loadTransfers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/transfers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setTransfers(data || []);
        } catch (error) {
            console.error('Error loading transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={styles.container}>Loading transfers...</div>;

    return (
        <div style={styles.container}>
            <h1>Internal Transfers</h1>
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th>Transfer #</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Status</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.length === 0 ? (
                            <tr><td colSpan="5" style={styles.empty}>No transfers yet</td></tr>
                        ) : (
                            transfers.map(t => (
                                <tr key={t.id}>
                                    <td>{t.transfer_number}</td>
                                    <td>{t.from_station_name || t.from_station_id}</td>
                                    <td>{t.to_station_name || t.to_station_id}</td>
                                    <td>
                                        <span style={{
                                            ...styles.status,
                                            background: t.status === 'confirmed' ? '#d4edda' : 
                                                       t.status === 'pending' ? '#fff3cd' : '#f8d7da',
                                            color: t.status === 'confirmed' ? '#155724' : 
                                                   t.status === 'pending' ? '#856404' : '#721c24'
                                        }}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px' },
    tableContainer: { overflowX: 'auto', marginTop: '20px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    status: { padding: '4px 8px', borderRadius: '4px', fontSize: '14px' },
    empty: { textAlign: 'center', padding: '20px', color: '#666' }
};

export default Transfers;
