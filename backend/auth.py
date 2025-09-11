#!/usr/bin/env python3
"""
Authentication routes for AI Route Optimizer
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import timedelta
import logging

from models import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from database import get_user_by_email, get_user_by_id, create_user

logger = logging.getLogger(__name__)

# Create router for authentication endpoints
auth_router = APIRouter(prefix="/auth", tags=["authentication"])

@auth_router.post("/signup")
async def signup(request: dict):
    """User registration endpoint"""
    try:
        name = request.get("name", "").strip()
        email = request.get("email", "").strip().lower()
        password = request.get("password", "")
        
        # Validation
        if not name or not email or not password:
            raise HTTPException(status_code=400, detail="All fields are required")
        
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        # Hash password and create user
        hashed_password = get_password_hash(password)
        user_id = create_user(name, email, hashed_password)
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_id), "email": email}, 
            expires_delta=access_token_expires
        )
        
        return {
            "token": access_token,
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            },
            "message": "Account created successfully!"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@auth_router.post("/login")
async def login(request: dict):
    """User login endpoint"""
    try:
        email = request.get("email", "").strip().lower()
        password = request.get("password", "")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password are required")
        
        # Get user from database
        user = get_user_by_email(email)
        
        if not user or not verify_password(password, user[3]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user[0]), "email": user[2]}, 
            expires_delta=access_token_expires
        )
        
        return {
            "token": access_token,
            "user": {
                "id": user[0],
                "name": user[1],
                "email": user[2]
            },
            "message": "Login successful!"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@auth_router.get("/verify")
async def verify_jwt_token(request: Request):
    """Verify JWT token from Authorization header"""
    try:
        # Debug: Log all headers
        logger.info(f"All headers: {dict(request.headers)}")
        
        # Get Authorization header
        authorization = request.headers.get("Authorization")
        logger.info(f"Authorization header: {authorization}")
        
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header missing")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        # Extract token
        token = authorization.replace("Bearer ", "")
        logger.info(f"Extracted token: {token[:20]}...")  # Log first 20 chars
        
        # Verify token
        token_data = verify_token(token)
        
        if not token_data:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        user = get_user_by_id(token_data["user_id"])
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "id": user[0],
            "name": user[1],
            "email": user[2]
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")