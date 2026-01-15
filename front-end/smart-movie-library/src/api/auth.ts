// src/api/auth.ts
import api from './client';

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  preferred_genres?: string[];
}

interface AuthResponse {
  access_token: string;
  token_type: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  preferred_genres?: string[];
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};