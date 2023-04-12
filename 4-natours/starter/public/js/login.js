import axios from 'axios';
import { showAlert } from './alerts.js';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://localhost:3000/api/v1/users/login',
      data: {
        email,
        password,
        // cors - pavel's solution to axios cors issue...
        // withCredentials: true,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully');
    }

    window.setTimeout(() => {
      location.assign('/');
    }, 1500);
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://localhost:3000/api/v1/users/logout',
    });

    console.log('data: ', res.data.status);

    if (res.data.status === 'success') {
      console.log('log out registered');
      location.reload(true);
    }
  } catch (err) {
    showAlert('error', 'Error logging out, please try again');
  }
};
