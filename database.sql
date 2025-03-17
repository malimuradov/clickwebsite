-- Connect to the correct database
\c webclicker_db

-- Create tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE temp_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE progress (
    id SERIAL PRIMARY KEY,
    temp_user_id INTEGER REFERENCES temp_users(id),
    user_id INTEGER REFERENCES users(id),
    natural_clicks INTEGER DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    best_cps INTEGER DEFAULT 0,
    flat_click_bonus INTEGER DEFAULT 0,
    percentage_click_bonus INTEGER DEFAULT 0,
    flat_auto_clicker INTEGER DEFAULT 0,
    percent_auto_clicker INTEGER DEFAULT 0,
    unlockables INTEGER[] DEFAULT ARRAY[0, 0, 0, 0, 0],
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure that exactly one user type is associated with each progress record
    CONSTRAINT one_user_type_only CHECK (
        (temp_user_id IS NOT NULL AND user_id IS NULL) OR
        (temp_user_id IS NULL AND user_id IS NOT NULL)
    )
);


