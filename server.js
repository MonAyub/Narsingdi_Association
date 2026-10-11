const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'ndsc_jwt_secret_fallback_key_2026';

// Helper to format DB user/entity to match frontend expectations (id / _id compatibility)
function formatRecord(record) {
    if (!record) return record;
    return {
        ...record,
        _id: record.id
    };
}

// ==================== MIDDLEWARE ====================
// Allow all origins (frontend and backend served from same Render domain)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// ==================== SEED DATA HELPER ====================
async function seedInitialData() {
    try {
        // 1. Seed Default Admin
        const adminUsername = (process.env.DEFAULT_ADMIN_USERNAME || 'admin').toLowerCase();
        const [existingAdmin] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR role = "admin" OR role = "superadmin" LIMIT 1',
            [adminUsername]
        );

        if (existingAdmin.length === 0) {
            const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(defaultPassword, salt);
            const defaultEmail = (process.env.ADMIN_EMAIL || 'admin@ndsc.mbstu.ac.bd').toLowerCase();

            await pool.query(
                `INSERT INTO users (name, username, email, password, role, status, approvedBy, approvedAt, department, session, upazila, phone, whatsapp)
                 VALUES (?, ?, ?, ?, ?, ?, NULL, NOW(), ?, ?, ?, ?, ?)`,
                [
                    'Council Administrator',
                    adminUsername,
                    defaultEmail,
                    hashedPassword,
                    'admin',
                    'approved',
                    'ICT',
                    'Executive',
                    'Narsingdi Sadar',
                    '01962382455',
                    '01962382455'
                ]
            );
            console.log(`👤 Default admin created -> Username: ${adminUsername} | Email: ${defaultEmail} | Password: ${defaultPassword}`);
        }

        // 2. Seed Initial Members if table is empty
        const [memberCountRes] = await pool.query('SELECT COUNT(*) as count FROM members');
        if (Number(memberCountRes[0].count) === 0) {
            const initialMembers = [
                ["Udoy Saha", "BMB", "2020-2021", "Monohardi", "01718583244", "01718583244", "approved"],
                ["Niloy Paul", "BGE", "2020-2021", "Raipura", "01619653550", "01619653550", "approved"],
                ["Ashraful Islam Jakir", "ICT", "2021-2022", "Belabo", "01859667793", "01859667793", "approved"],
                ["Monirojjaman Ayoive", "ICT", "2022-2023", "Monohardi", "01962382455", "01962382455", "approved"],
                ["Tahmid Hossain", "CSE", "2021-2022", "Shibpur", "01711223344", "01711223344", "approved"],
                ["Sadia Sultana", "Pharmacy", "2022-2023", "Narsingdi Sadar", "01822334455", "01822334455", "approved"],
                ["Mahfuzur Rahman", "ESRM", "2020-2021", "Palash", "01933445566", "01933445566", "approved"],
                ["Rifat Ahmed", "TE", "2023-2024", "Raipura", "01744556677", "01744556677", "approved"]
            ];

            for (const m of initialMembers) {
                await pool.query(
                    `INSERT INTO members (name, department, session, upazila, phone, whatsapp, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    m
                );
            }
            console.log(`📋 Seeded initial council members.`);
        }

        // 3. Seed Initial Notices if table is empty
        const [noticeCountRes] = await pool.query('SELECT COUNT(*) as count FROM notices');
        if (Number(noticeCountRes[0].count) === 0) {
            const initialNotices = [
                [
                    "Emergency Meeting Regarding Freshers' Ceremony",
                    "NOTICE",
                    "2026-07-12",
                    "All Executive Committee members are requested to attend an emergency meeting on July 15, 2026, at 5:00 PM at the Teacher-Student Center (TSC) corridor. Agenda: Budget finalization and guest selection for the Freshers' Reception & Farewell.",
                    1
                ],
                [
                    "Narsingdi District Student Council Wins Inter-District Cricket Championship!",
                    "NEWS",
                    "2025-12-10",
                    "In a spectacular final, Narsingdi Student Council defeated Gazipur Student Council by 5 wickets to lift the MBSTU Inter-District Cricket Trophy. Ashraful Islam Jakir was named Player of the Tournament for his outstanding all-round performance.",
                    1
                ],
                [
                    "Winter Relief & Blanket Distribution Drive in Narsingdi",
                    "NOTICE",
                    "2025-11-20",
                    "Our voluntary social development wing successfully distributed over 350 warm blankets and clothing sets to underprivileged winter victims across Monohardi and Belabo upazilas. Heartfelt thanks to all our donors.",
                    1
                ]
            ];
            for (const n of initialNotices) {
                await pool.query(
                    `INSERT INTO notices (title, category, date, content, isActive) VALUES (?, ?, ?, ?, ?)`,
                    n
                );
            }
            console.log(`📢 Seeded initial notices.`);
        }

        // 4. Seed Initial Events if table is empty
        const [eventCountRes] = await pool.query('SELECT COUNT(*) as count FROM events');
        if (Number(eventCountRes[0].count) === 0) {
            const initialEvents = [
                [
                    "Freshers' Reception & Farewell 2025",
                    "Upcoming",
                    "2025-11-08",
                    "MBSTU Multipurpose Bldg",
                    "The grand annual ceremony organized by the Narsingdi District Student Council, MBSTU. The event welcomes new students from Narsingdi district and bids farewell to our graduating seniors. Features a discussion panel, lunch feast, and an engaging cultural night showcasing district talents."
                ],
                [
                    "Annual District Picnic & River Cruise 2024",
                    "Completed",
                    "2024-02-17",
                    "Meghna Riverfront, Raipura",
                    "An unforgettable day of fellowship, boating, district traditional feast, and cultural bonding with over 150 members and alumni from across all 6 upazilas."
                ],
                [
                    "Inter-District Friendly Football Clash",
                    "Completed",
                    "2024-06-21",
                    "MBSTU Central Playground",
                    "A friendly inter-district sports tournament fostering camaraderie and physical wellness among students from various districts studying at MBSTU."
                ]
            ];
            for (const ev of initialEvents) {
                await pool.query(
                    `INSERT INTO events (title, type, date, location, description) VALUES (?, ?, ?, ?, ?)`,
                    ev
                );
            }
            console.log(`🎉 Seeded initial events.`);
        }
    } catch (seedErr) {
        console.error('Error during data seeding:', seedErr.message);
    }
}

// Initialize TiDB & Seed Data
initDB().then(() => {
    seedInitialData();
});

// ==================== AUTHENTICATION & ROLE MIDDLEWARES ====================
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No authentication token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token. Please log in again.'
        });
    }
};

const verifyAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Administrator privileges required.'
        });
    }
    next();
};

const authenticateAdmin = [verifyToken, verifyAdmin];

// ==================== AUTHENTICATION ROUTES ====================

// Register
const registerHandler = async (req, res) => {
    try {
        const { name, department, session, phone, email, password, upazila, whatsapp } = req.body;

        if (!name || !department || !session || !phone || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please fill in all required fields (Name, Department, Session, Phone, Email, Password).'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long.'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'An account with this email address already exists. Please log in.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [insertRes] = await pool.query(
            `INSERT INTO users (name, email, password, role, status, department, session, phone, upazila, whatsapp, profilePicture)
             VALUES (?, ?, ?, 'user', 'pending', ?, ?, ?, ?, ?, '')`,
            [
                name.trim(),
                normalizedEmail,
                hashedPassword,
                department.trim(),
                session.trim(),
                phone.trim(),
                upazila ? upazila.trim() : '',
                whatsapp ? whatsapp.trim() : phone.trim()
            ]
        );

        const newUserId = insertRes.insertId;

        const token = jwt.sign(
            {
                id: newUserId,
                _id: newUserId,
                name: name.trim(),
                email: normalizedEmail,
                username: name.trim(),
                role: 'user',
                status: 'pending',
                department: department.trim(),
                session: session.trim(),
                phone: phone.trim()
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(201).json({
            success: true,
            message: 'Account registered successfully! Registration is pending administrator approval.',
            token,
            user: {
                id: newUserId,
                _id: newUserId,
                name: name.trim(),
                email: normalizedEmail,
                role: 'user',
                status: 'pending',
                department: department.trim(),
                session: session.trim(),
                phone: phone.trim(),
                upazila: upazila ? upazila.trim() : '',
                whatsapp: whatsapp ? whatsapp.trim() : phone.trim(),
                profilePicture: ''
            }
        });
    } catch (err) {
        console.error('Error in register:', err);
        return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
    }
};

app.post('/api/auth/register', registerHandler);
app.post('/api/users/register', registerHandler);

// Login
const loginHandler = async (req, res) => {
    try {
        const identifier = req.body.email || req.body.username || req.body.identifier;
        const password = req.body.password;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide both email/username and password.'
            });
        }

        const normalizedInput = identifier.toLowerCase().trim();
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1',
            [normalizedInput, normalizedInput]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password.'
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password.'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                _id: user.id,
                name: user.name,
                email: user.email,
                username: user.username || user.name,
                role: user.role,
                status: user.status || 'pending',
                department: user.department,
                session: user.session,
                phone: user.phone
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            success: true,
            message: 'Authentication successful.',
            token,
            user: {
                id: user.id,
                _id: user.id,
                name: user.name || user.username || 'User',
                email: user.email,
                username: user.username,
                role: user.role || 'user',
                status: user.status || 'pending',
                department: user.department || '',
                session: user.session || '',
                upazila: user.upazila || '',
                phone: user.phone || '',
                whatsapp: user.whatsapp || user.phone || '',
                profilePicture: user.profilePicture || ''
            }
        });
    } catch (err) {
        console.error('Error in login:', err);
        return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
};

app.post('/api/auth/login', loginHandler);
app.post('/api/users/login', loginHandler);

// Get current user (me)
const getMeHandler = async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, username, email, role, status, department, session, phone, upazila, whatsapp, profilePicture, approvedBy, approvedAt, createdAt FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'User profile not found.' });
        }

        return res.status(200).json({
            success: true,
            user: formatRecord(users[0])
        });
    } catch (err) {
        console.error('Error in getMe:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
    }
};

app.get('/api/auth/me', verifyToken, getMeHandler);
app.get('/api/users/me', verifyToken, getMeHandler);
app.get('/api/auth/verify', verifyToken, getMeHandler);

// Update Profile
const updateMeHandler = async (req, res) => {
    try {
        const { name, department, session, upazila, phone, whatsapp, profilePicture } = req.body;
        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
        if (department !== undefined) { updates.push('department = ?'); values.push(department.trim()); }
        if (session !== undefined) { updates.push('session = ?'); values.push(session.trim()); }
        if (upazila !== undefined) { updates.push('upazila = ?'); values.push(upazila.trim()); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone.trim()); }
        if (whatsapp !== undefined) { updates.push('whatsapp = ?'); values.push(whatsapp.trim()); }
        if (profilePicture !== undefined) { updates.push('profilePicture = ?'); values.push(profilePicture.trim()); }

        if (updates.length > 0) {
            values.push(req.user.id);
            await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [users] = await pool.query(
            'SELECT id, name, username, email, role, status, department, session, phone, upazila, whatsapp, profilePicture, approvedBy, approvedAt, createdAt FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            user: formatRecord(users[0])
        });
    } catch (err) {
        console.error('Error in updateMe:', err);
        return res.status(500).json({ success: false, error: 'Failed to update profile.' });
    }
};

app.put('/api/auth/me', verifyToken, updateMeHandler);
app.put('/api/users/me', verifyToken, updateMeHandler);

// Admin: Get all registered accounts
app.get('/api/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, username, email, role, status, department, session, phone, upazila, whatsapp, profilePicture, createdAt FROM users ORDER BY createdAt DESC'
        );
        const formatted = users.map(formatRecord);
        return res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (err) {
        console.error('Error in GET /api/users:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve users.' });
    }
});

// Admin: Get Pending Users
app.get('/api/admin/pending-users', authenticateAdmin, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, username, email, role, status, department, session, phone, upazila, whatsapp, profilePicture, createdAt FROM users WHERE status = "pending" ORDER BY createdAt DESC'
        );
        const formatted = users.map(formatRecord);
        return res.status(200).json({
            success: true,
            count: formatted.length,
            pendingCount: formatted.length,
            data: formatted,
            users: formatted
        });
    } catch (err) {
        console.error('Error in GET /api/admin/pending-users:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve pending users.' });
    }
});

// Admin: Pending Count
app.get('/api/admin/pending-count', authenticateAdmin, async (req, res) => {
    try {
        const [result] = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = "pending"');
        return res.status(200).json({
            success: true,
            pendingCount: result[0].count
        });
    } catch (err) {
        console.error('Error in GET /api/admin/pending-count:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve pending count.' });
    }
});

// Admin: Approve User
app.put('/api/admin/approve-user/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        const user = users[0];
        await pool.query(
            'UPDATE users SET status = "approved", approvedBy = ?, approvedAt = NOW() WHERE id = ?',
            [req.user.id, id]
        );

        // Sync with members table
        const [existingMember] = await pool.query('SELECT id FROM members WHERE phone = ? LIMIT 1', [user.phone]);
        if (existingMember.length > 0) {
            await pool.query(
                'UPDATE members SET name = ?, department = ?, session = ?, upazila = ?, whatsapp = ?, status = "approved" WHERE phone = ?',
                [user.name, user.department, user.session, user.upazila || '', user.whatsapp || user.phone, user.phone]
            );
        } else {
            await pool.query(
                'INSERT INTO members (name, department, session, upazila, phone, whatsapp, status) VALUES (?, ?, ?, ?, ?, ?, "approved")',
                [user.name, user.department, user.session, user.upazila || '', user.phone, user.whatsapp || user.phone]
            );
        }

        return res.status(200).json({
            success: true,
            message: 'User approved successfully.',
            user: {
                id: user.id,
                _id: user.id,
                name: user.name,
                email: user.email,
                status: 'approved',
                approvedBy: req.user.id,
                approvedAt: new Date()
            }
        });
    } catch (err) {
        console.error('Error in PUT /api/admin/approve-user/:id:', err);
        return res.status(500).json({ success: false, error: 'Failed to approve user.' });
    }
});

// Admin: Reject User
app.put('/api/admin/reject-user/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        const user = users[0];
        await pool.query('UPDATE users SET status = "rejected" WHERE id = ?', [id]);
        await pool.query('UPDATE members SET status = "rejected" WHERE phone = ?', [user.phone]);

        return res.status(200).json({
            success: true,
            message: 'User rejected successfully.',
            user: {
                id: user.id,
                _id: user.id,
                name: user.name,
                email: user.email,
                status: 'rejected'
            }
        });
    } catch (err) {
        console.error('Error in PUT /api/admin/reject-user/:id:', err);
        return res.status(500).json({ success: false, error: 'Failed to reject user.' });
    }
});

// ==================== 2. MEMBER ROUTES ====================

// GET /api/members (Only approved members, with search and filters)
app.get('/api/members', async (req, res) => {
    try {
        const { upazila, department, session, search, q } = req.query;
        let query = 'SELECT * FROM members WHERE status = "approved"';
        const params = [];

        if (upazila) {
            query += ' AND LOWER(upazila) = LOWER(?)';
            params.push(upazila.trim());
        }
        if (department) {
            query += ' AND LOWER(department) = LOWER(?)';
            params.push(department.trim());
        }
        if (session) {
            query += ' AND session = ?';
            params.push(session.trim());
        }

        const searchQuery = (search || q || '').trim();
        if (searchQuery) {
            query += ' AND (name LIKE ? OR department LIKE ? OR upazila LIKE ? OR session LIKE ? OR phone LIKE ?)';
            const term = `%${searchQuery}%`;
            params.push(term, term, term, term, term);
        }

        query += ' ORDER BY session DESC, name ASC';

        const [members] = await pool.query(query, params);
        const formatted = members.map(formatRecord);

        return res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (err) {
        console.error('Error in GET /api/members:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve members.' });
    }
});

// POST /api/members (Admin only)
app.post('/api/members', authenticateAdmin, async (req, res) => {
    try {
        const { name, department, session, upazila, phone, whatsapp } = req.body;

        if (!name || !department || !session || !upazila || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Fields: name, department, session, upazila, and phone are required.'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO members (name, department, session, upazila, phone, whatsapp, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')`,
            [name.trim(), department.trim(), session.trim(), upazila.trim(), phone.trim(), whatsapp ? whatsapp.trim() : phone.trim()]
        );

        const [created] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);

        return res.status(201).json({
            success: true,
            message: 'Member added successfully.',
            data: formatRecord(created[0])
        });
    } catch (err) {
        console.error('Error in POST /api/members:', err);
        return res.status(500).json({ success: false, error: 'Failed to add member.' });
    }
});

// PUT /api/members/:id (Admin only)
app.put('/api/members/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, department, session, upazila, phone, whatsapp } = req.body;

        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
        if (department !== undefined) { updates.push('department = ?'); values.push(department.trim()); }
        if (session !== undefined) { updates.push('session = ?'); values.push(session.trim()); }
        if (upazila !== undefined) { updates.push('upazila = ?'); values.push(upazila.trim()); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone.trim()); }
        if (whatsapp !== undefined) { updates.push('whatsapp = ?'); values.push(whatsapp.trim()); }

        if (updates.length > 0) {
            values.push(id);
            await pool.query(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [updated] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        if (updated.length === 0) {
            return res.status(404).json({ success: false, error: 'Member not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Member updated successfully.',
            data: formatRecord(updated[0])
        });
    } catch (err) {
        console.error('Error in PUT /api/members/:id:', err);
        return res.status(500).json({ success: false, error: 'Failed to update member.' });
    }
});

// DELETE /api/members/:id (Admin only)
app.delete('/api/members/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM members WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Member not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Member deleted successfully.',
            id
        });
    } catch (err) {
        console.error('Error in DELETE /api/members/:id:', err);
        return res.status(500).json({ success: false, error: 'Failed to delete member.' });
    }
});

// ==================== 3. NOTICE ROUTES ====================

// GET /api/notices
app.get('/api/notices', async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM notices WHERE isActive = 1';
        const params = [];

        if (category && category !== 'ALL') {
            query += ' AND UPPER(category) = ?';
            params.push(category.toUpperCase());
        }

        query += ' ORDER BY date DESC, createdAt DESC';

        const [notices] = await pool.query(query, params);
        const formatted = notices.map(formatRecord);

        return res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (err) {
        console.error('Error in GET /api/notices:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve notices.' });
    }
});

// POST /api/notices (Admin only)
app.post('/api/notices', authenticateAdmin, async (req, res) => {
    try {
        const { title, category, date, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                error: 'Title and Content are required.'
            });
        }

        const noticeCategory = (category || 'NOTICE').toUpperCase();
        const noticeDate = date || new Date().toISOString().split('T')[0];

        const [result] = await pool.query(
            `INSERT INTO notices (title, category, date, content, isActive) VALUES (?, ?, ?, ?, 1)`,
            [title.trim(), noticeCategory, noticeDate, content.trim()]
        );

        const [created] = await pool.query('SELECT * FROM notices WHERE id = ?', [result.insertId]);

        return res.status(201).json({
            success: true,
            message: 'Notice published successfully.',
            data: formatRecord(created[0])
        });
    } catch (err) {
        console.error('Error in POST /api/notices:', err);
        return res.status(500).json({ success: false, error: 'Failed to publish notice.' });
    }
});

// PUT /api/notices/:id (Admin only)
app.put('/api/notices/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, date, content, isActive } = req.body;

        const updates = [];
        const values = [];

        if (title !== undefined) { updates.push('title = ?'); values.push(title.trim()); }
        if (category !== undefined) { updates.push('category = ?'); values.push(category.toUpperCase()); }
        if (date !== undefined) { updates.push('date = ?'); values.push(date.trim()); }
        if (content !== undefined) { updates.push('content = ?'); values.push(content.trim()); }
        if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive ? 1 : 0); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields provided to update.' });
        }

        values.push(id);
        const [result] = await pool.query(`UPDATE notices SET ${updates.join(', ')} WHERE id = ?`, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Notice not found.' });
        }

        const [updated] = await pool.query('SELECT * FROM notices WHERE id = ?', [id]);
        return res.status(200).json({
            success: true,
            message: 'Notice updated successfully.',
            data: formatRecord(updated[0])
        });
    } catch (err) {
        console.error('Error in PUT /api/notices/:id:', err);
        return res.status(500).json({ success: false, error: 'Failed to update notice.' });
    }
});

// DELETE /api/notices/:id (Admin only)
app.delete('/api/notices/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM notices WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Notice not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Notice deleted successfully.',
            id
        });
    } catch (err) {
        console.error('Error in DELETE /api/notices/:id:', err);
        return res.status(500).json({ success: false, error: 'Failed to delete notice.' });
    }
});

// ==================== 4. EVENT ROUTES ====================

// GET /api/events
app.get('/api/events', async (req, res) => {
    try {
        const { type } = req.query;
        let query = 'SELECT * FROM events WHERE 1=1';
        const params = [];

        if (type) {
            query += ' AND LOWER(type) = LOWER(?)';
            params.push(type.trim());
        }

        query += ' ORDER BY date DESC';

        const [events] = await pool.query(query, params);
        const formatted = events.map(formatRecord);

        return res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (err) {
        console.error('Error in GET /api/events:', err);
        return res.status(500).json({ success: false, error: 'Failed to retrieve events.' });
    }
});

// POST /api/events (Admin only)
app.post('/api/events', authenticateAdmin, async (req, res) => {
    try {
        const { title, type, date, location, description } = req.body;

        if (!title || !date || !location || !description) {
            return res.status(400).json({
                success: false,
                error: 'Title, Date, Location, and Description are required.'
            });
        }

        const normalizedType = (type && type.toLowerCase() === 'completed') ? 'Completed' : 'Upcoming';

        const [result] = await pool.query(
            `INSERT INTO events (title, type, date, location, description) VALUES (?, ?, ?, ?, ?)`,
            [title.trim(), normalizedType, date.trim(), location.trim(), description.trim()]
        );

        const [created] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);

        return res.status(201).json({
            success: true,
            message: 'Event created successfully.',
            data: formatRecord(created[0])
        });
    } catch (err) {
        console.error('Error in POST /api/events:', err);
        return res.status(500).json({ success: false, error: 'Failed to create event.' });
    }
});

// PUT /api/events/:id (Admin only)
app.put('/api/events/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, type, date, location, description } = req.body;

        const updates = [];
        const values = [];

        if (title !== undefined) { updates.push('title = ?'); values.push(title.trim()); }
        if (type !== undefined) {
            const normalizedType = type.toLowerCase() === 'completed' ? 'Completed' : 'Upcoming';
            updates.push('type = ?'); values.push(normalizedType);
        }
        if (date !== undefined) { updates.push('date = ?'); values.push(date.trim()); }
        if (location !== undefined) { updates.push('location = ?'); values.push(location.trim()); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description.trim()); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields provided to update.' });
        }

        values.push(id);
        const [result] = await pool.query(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Event not found.' });
        }

        const [updated] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
        return res.status(200).json({
            success: true,
            message: 'Event updated successfully.',
            data: formatRecord(updated[0])
        });
    } catch (err) {
        console.error('Error in PUT /api/events/:id:', err);
        return res.status(500).json({ success: false, error: 'Failed to update event.' });
    }
});

// DELETE /api/events/:id (Admin only)
app.delete('/api/events/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Event not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Event deleted successfully.',
            id
        });
    } catch (err) {
        console.error('Error in DELETE /api/events/:id:', err);
        return res.status(500).json({ success: false, error: 'Failed to delete event.' });
    }
});

// ==================== 5. CONTACT MESSAGE HANDLERS ====================
app.post('/send-otp', async (req, res) => {
    // If you don't use Gmail SMTP, simply return success
    return res.status(200).json({ 
        success: true, 
        message: 'Verification bypassed (Email service disabled).' 
    });
});

app.post('/submit-message', async (req, res) => {
    return res.status(200).json({ 
        success: true, 
        message: 'Your message has been received successfully!' 
    });
});

// ==================== 6. MPA PAGE ROUTES ====================
const mpaPages = ['members', 'notices', 'events', 'login', 'register', 'dashboard', 'profile', 'admin'];
mpaPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${page}.html`));
    });
});

// Fallback route for client-side navigation
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 NDSC Full-Stack Server running on http://localhost:${PORT}`);
    console.log(`📡 Backend powered by TiDB / MySQL`);
    console.log(`====================================================`);
});
