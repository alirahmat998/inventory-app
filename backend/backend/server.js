const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// ========== DATABASE CONNECTION ==========
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ========== MIDDLEWARE ==========
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// ========== AUTH MIDDLEWARE ==========
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await pool.query(
            'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (user.rows.length === 0 || !user.rows[0].is_active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = user.rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ========== AUTH ROUTES ==========
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query(
            'SELECT id, email, full_name, password_hash, role, is_active FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const stationsResult = await pool.query(
            `SELECT s.* FROM stations s
             JOIN user_stations us ON us.station_id = s.id
             WHERE us.user_id = $1`,
            [user.id]
        );

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                stations: stationsResult.rows
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ========== STATION ROUTES ==========
app.get('/api/stations', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const result = await pool.query('SELECT * FROM stations WHERE status = $1 ORDER BY name', ['active']);
            res.json(result.rows);
        } else {
            const result = await pool.query(
                `SELECT s.* FROM stations s
                 JOIN user_stations us ON us.station_id = s.id
                 WHERE us.user_id = $1 AND s.status = $2
                 ORDER BY s.name`,
                [req.user.id, 'active']
            );
            res.json(result.rows);
        }
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({ error: 'Failed to fetch stations' });
    }
});

// ========== PRODUCT ROUTES ==========
app.get('/api/products', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, s.name as supplier_name 
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.is_active = true
            ORDER BY p.name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// ========== INVENTORY ROUTES ==========
app.get('/api/inventory/:stationId', authenticate, async (req, res) => {
    try {
        const { stationId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const result = await pool.query(`
            SELECT 
                p.id as product_id,
                p.product_id,
                p.name as product_name,
                p.cost_price,
                p.selling_price,
                COALESCE(i.opening_qty, 0) as opening_qty,
                COALESCE(i.received_qty, 0) as received_qty,
                COALESCE(i.internal_received_qty, 0) as internal_received_qty,
                COALESCE(i.internal_transfer_qty, 0) as internal_transfer_qty,
                COALESCE(i.return_to_vendor_qty, 0) as return_to_vendor_qty,
                COALESCE(i.sold_qty, 0) as sold_qty,
                COALESCE(i.closing_qty, 0) as closing_qty
            FROM products p
            LEFT JOIN inventory_snapshots i ON i.product_id = p.id AND i.station_id = $1 AND i.snapshot_date = $2
            WHERE p.is_active = true
            ORDER BY p.name
        `, [stationId, today]);

        res.json({
            station_id: stationId,
            date: today,
            inventory: result.rows
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

app.post('/api/inventory', authenticate, async (req, res) => {
    try {
        const { stationId, entries } = req.body;
        const today = new Date().toISOString().split('T')[0];

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const entry of entries) {
                const { 
                    productId, openingQty, receivedQty, internalReceivedQty, 
                    internalTransferQty, returnToVendorQty, soldQty 
                } = entry;

                const closingQty = (openingQty || 0) + (receivedQty || 0) + (internalReceivedQty || 0) - 
                                 (internalTransferQty || 0) - (returnToVendorQty || 0) - (soldQty || 0);

                await client.query(`
                    INSERT INTO inventory_snapshots 
                    (station_id, product_id, snapshot_date, opening_qty, received_qty, 
                     internal_received_qty, internal_transfer_qty, return_to_vendor_qty, 
                     sold_qty, closing_qty, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (station_id, product_id, snapshot_date)
                    DO UPDATE SET
                        opening_qty = EXCLUDED.opening_qty,
                        received_qty = EXCLUDED.received_qty,
                        internal_received_qty = EXCLUDED.internal_received_qty,
                        internal_transfer_qty = EXCLUDED.internal_transfer_qty,
                        return_to_vendor_qty = EXCLUDED.return_to_vendor_qty,
                        sold_qty = EXCLUDED.sold_qty,
                        closing_qty = EXCLUDED.closing_qty,
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    stationId, productId, today, openingQty, receivedQty,
                    internalReceivedQty, internalTransferQty, returnToVendorQty,
                    soldQty, closingQty, req.user.id
                ]);
            }

            await client.query('COMMIT');
            res.json({ message: 'Inventory saved successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error saving inventory:', error);
        res.status(500).json({ error: 'Failed to save inventory' });
    }
});

// ========== TRANSFER ROUTES ==========
app.get('/api/transfers', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.*,
                fs.name as from_station_name,
                ts.name as to_station_name
            FROM internal_transfers t
            JOIN stations fs ON fs.id = t.from_station_id
            JOIN stations ts ON ts.id = t.to_station_id
            ORDER BY t.created_at DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching transfers:', error);
        res.status(500).json({ error: 'Failed to fetch transfers' });
    }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========== START SERVER ==========
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});
