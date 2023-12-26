import axios, { AxiosHeaders } from "axios";
import { API_ENDPOINT_BASE } from "./AppSettings";

export const getCSRFToken = async (): Promise<string> => {
  const res = await axios.get(`${API_ENDPOINT_BASE}/api/csrf/`, {});
  const headers = res.headers
  if (headers instanceof AxiosHeaders && headers.has('X-CSRFToken')) {
    return headers.get("X-CSRFToken") as string
  }
  throw new Error('no X-CSRFToken in headers')
};

export const login = async (csrfToken: string, username: string, password: string) => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/login/`, { username, password }, {
    headers: {
      "X-CSRFToken": csrfToken
    }
  });
  return response.data
}

export const logout = async (csrfToken: string) => {
  await axios.post(`${API_ENDPOINT_BASE}/api/logout/`, {}, {
    headers: {
      "X-CSRFToken": csrfToken
    }
  });
}

export const getConnectionToken = async () => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/token/connection/`, {})
  return response.data.token;
}

export const getSubscriptionToken = async (channel: string) => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/token/subscription/`, {
    params: { channel: channel }
  });
  return response.data.token;
}

export const getRooms = async () => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/rooms/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data.results
};

export const searchRooms = async () => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/search/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data.results
};

export const getRoom = async (roomId: string) => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data
};

export const getMessages = async (roomId: string) => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/messages/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })
  return response.data.results
}

export const addMessage = async (csrfToken: string, roomId: string, content: string) => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/messages/`, {
    'content': content
  }, {
    headers: {
      'X-CSRFToken': csrfToken
    }
  });
  return response.data
}

export const joinRoom = async (csrfToken: string, roomId: string) => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/join/`, {}, {
    headers: {
      'X-CSRFToken': csrfToken
    }
  });
  return response.data
}

export const leaveRoom = async (csrfToken: string, roomId: string) => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/leave/`, {}, {
    headers: {
      'X-CSRFToken': csrfToken
    }
  });
  return response.data
}
