import axios from "axios";
const request = axios.create({
  baseURL: import.meta.env.VITE_BASE_API,
  timeout: 5000,
});

request.interceptors.request.use((config) => {
  return config;
});

request.interceptors.response.use(
  (res) => {
    return res.data;
  },
  (error) => {
    let status = error.response.code;
    let errmessage = "";
    switch (status) {
      case 401:
        errmessage = "TOKEN过期";
    }
  }
);

export default request;
