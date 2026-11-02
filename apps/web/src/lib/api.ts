import axios from "axios";
import { BACKEND_URL } from "@/lib/config";

export const api = axios.create({ baseURL: `${BACKEND_URL}/api/v1` });

// Clerk gives us a fresh token every time we ask — App.tsx plugs its getToken in here.
let getToken: (() => Promise<string | null>) | null = null;
export function setTokenGetter(fn: () => Promise<string | null>) {
  getToken = fn;
}

api.interceptors.request.use(async (config) => {
  const token = getToken ? await getToken() : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(err: unknown, fallback = "Something went wrong. Try again?") {
  if (axios.isAxiosError(err)) return err.response?.data?.msg ?? fallback;
  if (err instanceof Error) return err.message;
  return fallback;
}
