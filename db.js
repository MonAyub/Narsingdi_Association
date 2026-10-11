const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for TiDB / MySQL
const pool = mysql.createPool({
    host: process.env.TIDB_HOST || '127.0.0.1',
    port: parseInt(process.env.TIDB_PORT || '4000', 10),
    user: process.env.TIDB_USER || 'root',
    password: process.env.TIDB_PASSWORD || '',
    database: process.env.TIDB_DATABASE || 'ndsc_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.TIDB_ENABLE_SSL === 'false' ? false : {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

/**
 * Initialize Tables (Auto-migrate if not exists)
 */
async function initDB() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to TiDB / MySQL successfully.');

        // 1. Users Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(100) NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                status VARCHAR(50) DEFAULT 'pending',
                department VARCHAR(100) NOT NULL,
                session VARCHAR(50) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                upazila VARCHAR(100) DEFAULT '',
                whatsapp VARCHAR(50) DEFAULT '',
                profilePicture TEXT DEFAULT '',
                approvedBy INT NULL,
                approvedAt DATETIME NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Members Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                department VARCHAR(100) NOT NULL,
                session VARCHAR(50) NOT NULL,
                upazila VARCHAR(100) NOT NULL,
                phone VARCHAR(50) NOT NULL UNIQUE,
                whatsapp VARCHAR(50) DEFAULT '',
                status VARCHAR(50) DEFAULT 'approved',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Notices Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                category VARCHAR(50) DEFAULT 'NOTICE',
                date VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                isActive TINYINT(1) DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. Events Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                type VARCHAR(50) DEFAULT 'Upcoming',
                date VARCHAR(50) NOT NULL,
                location VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        connection.release();
        console.log('✅ TiDB schema and tables verified/created successfully.');
    } catch (err) {
        console.error('❌ TiDB Connection/Migration error:', err.message);
    }
}

module.exports = {
    pool,
    initDB
};
