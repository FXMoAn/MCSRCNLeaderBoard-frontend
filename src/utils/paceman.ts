import axios from 'axios';

const pacemanApi = axios.create({
  baseURL: 'https://paceman.gg/api',
  timeout: 10000,
});

export default pacemanApi;
