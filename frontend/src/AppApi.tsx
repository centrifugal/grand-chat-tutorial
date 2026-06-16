import axios, { AxiosHeaders } from "axios";
import { API_ENDPOINT_BASE } from "./AppSettings";
import type { AuthInfo, DeviceInfo, Message, Room, RoomMembership, RoomSearchResult } from "./types";

// All requests are authenticated with Django's session cookie, which the
// browser sends automatically. State-changing (POST) requests additionally
// need the CSRF token in the X-CSRFToken header.

export const getCSRFToken = async (): Promise<string> => {
  const res = await axios.get(`${API_ENDPOINT_BASE}/api/csrf/`, {});
  const headers = res.headers
  if (headers instanceof AxiosHeaders && headers.has('X-CSRFToken')) {
    return headers.get("X-CSRFToken") as string
  }
  throw new Error('no X-CSRFToken in headers')
};

export const login = async (csrfToken: string, username: string, password: string): Promise<AuthInfo> => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/login/`, { username, password }, {
    headers: {
      "X-CSRFToken": csrfToken
    }
  });
  return response.data
}

export const logout = async (csrfToken: string, deviceId: string): Promise<void> => {
  await axios.post(`${API_ENDPOINT_BASE}/api/logout/`, {
    'device_id': deviceId
  }, {
    headers: {
      "X-CSRFToken": csrfToken
    }
  });
}

export const getConnectionToken = async (): Promise<string> => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/token/connection/`, {})
  return response.data.token;
}

export const getSubscriptionToken = async (channel: string): Promise<string> => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/token/subscription/`, {
    params: { channel: channel }
  });
  return response.data.token;
}

export const getRooms = async (): Promise<Room[]> => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/rooms/`);
  return response.data.results
};

export const searchRooms = async (): Promise<RoomSearchResult[]> => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/search/`);
  return response.data.results
};

export const getRoom = async (roomId: string): Promise<Room> => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/`);
  return response.data
};

export const getMessages = async (roomId: string): Promise<Message[]> => {
  const response = await axios.get(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/messages/`)
  return response.data.results
}

export const addMessage = async (csrfToken: string, roomId: string, content: string): Promise<Message> => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/messages/`, {
    'content': content
  }, {
    headers: {
      'X-CSRFToken': csrfToken
    }
  });
  return response.data
}

export const joinRoom = async (csrfToken: string, roomId: string): Promise<RoomMembership> => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/join/`, {}, {
    headers: {
      'X-CSRFToken': csrfToken
    }
  });
  return response.data
}

export const leaveRoom = async (csrfToken: string, roomId: string): Promise<RoomMembership> => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/rooms/${roomId}/leave/`, {}, {
    headers: {
      'X-CSRFToken': csrfToken
    }
  });
  return response.data
}

export const registerDevice = async (csrfToken: string, deviceInfo: DeviceInfo): Promise<{ device_id: string }> => {
  const response = await axios.post(`${API_ENDPOINT_BASE}/api/device/register/`, {
    'device': deviceInfo
  }, {
    headers: {
      'X-CSRFToken': csrfToken
    }
  });
  return response.data
}
