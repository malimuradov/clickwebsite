-- Connect to the correct database
\c worldclicker_db

-- Create tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_clicks BIGINT DEFAULT 0,
    best_cps INTEGER DEFAULT 0,
    flat_click_bonus INTEGER DEFAULT 0,
    percentage_click_bonus DECIMAL(5,2) DEFAULT 1.00,
    flat_auto_clicker INTEGER DEFAULT 0,
    percent_auto_clicker INTEGER DEFAULT 0,
    drawing_unlocked BOOLEAN DEFAULT FALSE,
    gambling_unlocked BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
