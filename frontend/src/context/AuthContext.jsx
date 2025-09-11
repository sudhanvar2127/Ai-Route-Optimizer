import React, { createContext, useState, useContext, useEffect } from "react";
import axios from 'axios';

export const AuthContext = createContext();

// Create the axios instance that will be shared
const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// This is the provider component, now named AuthProvider
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [loading, setLoading] = useState(true);

    // This effect runs once when the app loads to restore session
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            setToken(storedToken);
            // Set the Authorization header for all future API calls
            apiClient.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;

            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error("Could not parse user from localStorage", e);
                }
            }
        }
        // Finished the initial check, allow the rest of the app to render
        setLoading(false);
    }, []);

    // --- Authentication Functions ---

    const signup = async (email, password) => {
        try {
            const response = await apiClient.post("/auth/signup", { email, password });
            const { token, ...userData } = response.data;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(userData));

            setToken(token);
            setUser(userData);
            apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            return response.data;
        } catch (error) {
            console.error("Signup Error:", error.response ? error.response.data : error.message);
            throw error.response?.data || new Error("Signup failed");
        }
    };

    const login = async (email, password) => {
        try {
            const response = await apiClient.post("/auth/login", { email, password });
            const { token, ...userData } = response.data;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(userData));

            setToken(token);
            setUser(userData);
            apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            return response.data;
        } catch (error) {
            console.error("Login Error:", error.response ? error.response.data : error.message);
            throw error.response?.data || new Error("Login failed");
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);
        delete apiClient.defaults.headers.common["Authorization"];
    };

    // The value provided to the rest of the app
    const value = {
        user,
        token,
        loading,
        signup,
        login,
        logout,
        apiClient, // Pass the apiClient instance itself
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;

// Custom hook for easy consumption
export const useAuth = () => {
    return useContext(AuthContext);
};