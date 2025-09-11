import axios from 'axios';

// Create a new instance of axios with a custom configuration
const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api', // Your backend's base URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interceptor to add the JWT token to every request ---
// This function will be called before every request is sent.
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- API Methods ---

// Auth
export const signupUser = (email, password) => {
    return apiClient.post('/auth/signup', { email, password });
};

export const loginUser = (email, password) => {
    return apiClient.post('/auth/login', { email, password });
};

// Places (we can add these later)
export const getSavedPlaces = () => {
    return apiClient.get('/places');
};

export const saveNewPlace = (placeData) => {
    return apiClient.post('/places', placeData);
};

export const deletePlaceById = (placeId) => {
    return apiClient.delete(`/places/${placeId}`);
};

export default apiClient;