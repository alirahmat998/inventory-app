import React, { useState, useEffect } from 'react';

const Inventory = () => {
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadStations();
    }, []);

    const loadStations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/stations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setStations(data);
            if (data.length > 0) {
                setSelectedStation(data[0]);
                loadInventory(data[0].id);
            }
        } catch (error) {
            console.error('Error loading stations:', error);
        }
    };

    const loadInventory = async (stationId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/inventory/${stationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setInventory(data.inventory || []);
        } catch (error) {
            console.error('Error loading inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStationChange = (stationId) => {
        const station = stations.find(s => s.id === stationId);
        setSelectedStation(station);
        loadInventory(stationId);
    };

    const handleUpdate = (index, field, value) => {
        const updated = [...inventory];
        const item = updated[index];
        item[field] = parseInt(value) || 0;
        item.closing_qty = (item.opening_qty || 0) + (item.received_qty || 0) + (item.internal_received_qty || 0) - 
                          (item.internal_transfer_qty || 0) - (item.return_to_vendor_qty || 0) - (item.sold_qty || 0);
        setInventory(updated);
        setMessage('');
    };

    const handleSave = async () => {
        if (!selectedStation) return;
        setSaving(true);
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/inventory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    stationId: selectedStation.id,
                    entries: inventory.map(item => ({
                        productId: item.product_id,
                        openingQty: item.opening_qty || 0,
                        receivedQty: item.received_qty || 0,
                        internalReceivedQty: item.internal_received_qty || 0,
                        internalTransferQty: item.internal_transfer_qty || 0,
                        returnToVendorQty: item.return_to_vendor_qty || 0,
                        soldQty: item.sold_qty || 0
                    }))
                })
            });

            if (!response.ok) throw new Error('Failed to save');
            setMessage('✅ Inventory saved successfully!');
        } catch (error) {
            setMessage('❌ Error saving inventory: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={styles.container}>Loading inventory...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1>Inventory Management</h1>
                <div style={styles.controls}>
                    <select
                        value={selectedStation?.id || ''}
                        onChange={(e) => handleStationChange(e.target.value)}
                        style={styles.select}
                    >
                        {stations.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
                        {saving ? 'Saving...' : '💾 Save Inventory'}
                    </button>
                </div>
                {message && <div style={styles.message}>{message}</div>}
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Opening</th>
                            <th>Received</th>
                            <th>Internal Received</th>
                            <th>Internal Transfer</th>
                            <th>Return to Vendor</th>
                            <th>Sold</th>
                            <th>Closing</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map((item, index) => (
                            <tr key={item.product_id}>
                                <td>{item.product_name}</td>
                                <td>
                                    <input
                                        type="number"
                                        value={item.opening_qty}
                                        onChange={(e) => handleUpdate(index, 'opening_qty', e.target.value)}
                                        style={styles.input}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={item.received_qty}
                                        onChange={(e) => handleUpdate(index, 'received_qty', e.target.value)}
                                        style={styles.input}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={item.internal_received_qty}
                                        onChange={(e) => handleUpdate(index, 'internal_received_qty', e.target.value)}
                                        style={styles.input}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={item.internal_transfer_qty}
                                        onChange={(e) => handleUpdate(index, 'internal_transfer_qty', e.target.value)}
                                        style={styles.input}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={item.return_to_vendor_qty}
                                        onChange={(e) => handleUpdate(index, 'return_to_vendor_qty', e.target.value)}
                                        style={styles.input}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={item.sold_qty}
                                        onChange={(e) => handleUpdate(index, 'sold_qty', e.target.value)}
                                        style={styles.input}
                                    />
                                </td>
                                <td style={styles.closing}>{item.closing_qty}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px' },
    header: { marginBottom: '20px' },
    controls: { display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' },
    select: { padding: '8px', borderRadius: '4px', border: '1px solid #ddd' },
    saveButton: {
        padding: '8px 20px',
        background: '#ff6b00',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    message: { marginTop: '10px', padding: '10px', borderRadius: '4px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    input: { width: '70px', padding: '4px', border: '1px solid #ddd', borderRadius: '3px' },
    closing: { fontWeight: 'bold', color: '#ff6b00' }
};

export default Inventory;
