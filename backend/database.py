#!/usr/bin/env python3
"""
Database utilities for AI Route Optimizer
"""

import sqlite3
import logging

logger = logging.getLogger(__name__)

def init_db():
    """Initialize database with users table"""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

def get_user_by_email(email):
    """Get user by email"""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, hashed_password FROM users WHERE email = ?",
        (email,)
    )
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id):
    """Get user by ID"""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def create_user(name, email, hashed_password):
    """Create a new user"""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT email FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return None
    
    # Create user
    cursor.execute(
        "INSERT INTO users (name, email, hashed_password) VALUES (?, ?, ?)",
        (name, email, hashed_password)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id