import axios from 'axios';
// import Config from 'react-native-config';

export const api = axios.create({
  baseURL: 'https://vigilarapp-backend-production.up.railway.app',
  timeout: 10000, 
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.message === 'Network Error') {
      throw new Error('No se pudo conectar al servidor. Verifica tu red o la URL base.');
    }
    throw error;
  }
);