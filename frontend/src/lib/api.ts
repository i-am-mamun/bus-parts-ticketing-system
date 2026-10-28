import axios, { AxiosError } from "axios";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const axiosClient = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("car_inventory_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ detail?: string; message?: string }>) => {
    const status = error.response?.status ?? 0;
    const serverData = error.response?.data;
    const message = serverData?.detail || serverData?.message || error.message || "An error occurred";

    if (status === 401 && typeof window !== "undefined") {
      const isLogin = window.location.pathname.includes("/login");
      if (!isLogin) {
        localStorage.removeItem("car_inventory_token");
        localStorage.removeItem("car_inventory_user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(new ApiError(message, status));
  }
);

export const api = {
  get: <T>(path: string, config?: any) => axiosClient.get<T>(path, config).then((res) => res.data),
  post: <T>(path: string, body?: unknown, config?: any) => axiosClient.post<T>(path, body, config).then((res) => res.data),
  put: <T>(path: string, body?: unknown, config?: any) => axiosClient.put<T>(path, body, config).then((res) => res.data),
  patch: <T>(path: string, body?: unknown, config?: any) => axiosClient.patch<T>(path, body, config).then((res) => res.data),
  del: <T>(path: string, config?: any) => axiosClient.delete<T>(path, config).then((res) => res.data),
  delete: <T>(path: string, config?: any) => axiosClient.delete<T>(path, config).then((res) => res.data),
  postFormData: <T>(path: string, formData: FormData) =>
    axiosClient.post<T>(path, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => res.data),
};
