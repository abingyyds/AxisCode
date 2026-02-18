export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function isLoggedIn() {
  return !!getToken();
}
