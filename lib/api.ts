import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
  withCredentials: false,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  // TODO: anexar token quando implementarmos auth
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      // TODO: redirecionar para login conforme fluxo de auth
    }
    return Promise.reject(error);
  }
);


