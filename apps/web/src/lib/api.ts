import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production';
const API_URL = isProduction 
  ? window.location.origin 
  : 'http://localhost:3000';

export const api = {
  client: axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  }),

  // Métodos de Elite
  async fetchClients() {
    const { data } = await api.client.get('/api/clients');
    return data;
  },

  async get(url: string) {
    return api.client.get(url);
  },

  async post(url: string, data: any) {
    return api.client.post(url, data);
  }
};