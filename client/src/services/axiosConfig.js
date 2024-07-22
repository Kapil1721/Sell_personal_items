import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:8000/api/v1"
    : "https://sell-personal-items-server.vercel.app/api/v1";

const axiosInstance = axios.create({
  // baseURL: baseURL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("_sell_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login-register?tab=login";  // redirect to login page
    }
    return Promise.reject(error);
  }
);

//

export const apiConnector = (method, url, bodyData, headers, params) => {
  const config = {
    method,
    url,
    data: JSON.stringify(bodyData) || null,
    headers: headers
      ? headers
      : {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
          "Access-Control-Allow-Headers":
            "Origin, X-Requested-With, Content-Type, Accept, Authorization",
        },

    params: params ? params : null,
    // credentials: "include",
    withCredentials: true,
  };

  return axiosInstance(config);
};
