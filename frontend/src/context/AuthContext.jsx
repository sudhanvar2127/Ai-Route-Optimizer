import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  console.log("AuthContext state:", { user, loading, token }); // Debug log

  useEffect(() => {
    console.log("useEffect triggered, token:", token); // Debug log

    if (token) {
      verifyToken();
    } else {
      console.log("No token, setting loading to false"); // Debug log
      setLoading(false);
    }
  }, [token]); // Make sure dependencies are correct

  const verifyToken = async () => {
    console.log("Verifying token..."); // Debug log

    try {
      const response = await fetch("http://localhost:8000/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Verify response:", response.status); // Debug log

      if (response.ok) {
        const userData = await response.json();
        console.log("User data received:", userData); // Debug log
        setUser(userData);
      } else {
        console.log("Token verification failed"); // Debug log
        localStorage.removeItem("token");
        setToken(null);
      }
    } catch (error) {
      console.error("Token verification error:", error);
      localStorage.removeItem("token");
      setToken(null);
    } finally {
      console.log("Setting loading to false"); // Debug log
      setLoading(false); // ← CRITICAL: Always set loading to false
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: "Login successful!" };
      } else {
        return { success: false, message: data.message || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Network error. Please try again." };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const response = await fetch("http://localhost:8000/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: "Account created successfully!" };
      } else {
        return { success: false, message: data.message || "Signup failed" };
      }
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, message: "Network error. Please try again." };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
