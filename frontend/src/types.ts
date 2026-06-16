import type { Dispatch } from 'react';
import type { FirebaseOptions } from 'firebase/app';

// Domain models. These mirror the JSON returned by the Django REST API – see
// backend/chat/serializers.py. We keep them in one place so every component
// works with the same well-typed shapes instead of `any`.

export interface User {
  id: number;
  username: string;
}

// Lightweight room info embedded into each Message (MessageRoomSerializer).
export interface MessageRoom {
  id: number;
  version: number;
  bumped_at: string;
}

// A chat message (MessageSerializer), also the body of a `message_added` event.
export interface Message {
  id: number;
  content: string;
  user: User;
  room: MessageRoom;
  created_at: string;
}

// The last message preview embedded into a Room (LastMessageSerializer). It has
// no `room` field, so a full Message is assignable to it but not vice versa.
export interface LastMessage {
  id: number;
  content: string;
  user: User;
  created_at: string;
}

// A room as returned by RoomSerializer: room list, room detail and the room
// carried by `user_joined` / `user_left` events.
export interface Room {
  id: number;
  name: string;
  version: number;
  bumped_at: string;
  member_count: number;
  last_message: LastMessage | null;
}

// A room as returned by the search endpoint (RoomSearchSerializer).
export interface RoomSearchResult {
  id: number;
  name: string;
  created_at: string;
  is_member: boolean;
}

// Membership body of `user_joined` / `user_left` events (RoomMemberSerializer).
export interface RoomMembership {
  room: Room;
  user: User;
}

// Authentication info returned by the login endpoint and persisted in
// LocalStorage. It is empty (`{}`) when nobody is logged in, so all fields are
// optional.
export interface AuthInfo {
  id?: number;
  username?: string;
  settings?: {
    push_notifications?: {
      enabled: boolean;
      vapid_public_key: string;
      firebase_config: FirebaseOptions;
    };
  };
}

// Real-time events delivered over the user's personal channel. The top-level
// `type` lets the frontend tell them apart – see backend/chat/views.py.
export type RealTimeEvent =
  | { type: 'message_added'; body: Message }
  | { type: 'user_joined'; body: RoomMembership }
  | { type: 'user_left'; body: RoomMembership };

// Chat state managed by the reducer in App.tsx.
export interface ChatState {
  // Ordered room IDs – the source of truth for room order on the screen.
  rooms: number[];
  // Room objects by id. A `null` value marks a room the user has left; we keep
  // the key so the search screen can sync its membership badge.
  roomsById: Record<number, Room | null>;
  // Messages by room id.
  messagesByRoomId: Record<number, Message[]>;
}

export const initialChatState: ChatState = {
  rooms: [],
  roomsById: {},
  messagesByRoomId: {},
};

// Actions accepted by the chat reducer.
export type ChatAction =
  | { type: 'CLEAR_CHAT_STATE' }
  | { type: 'ADD_ROOMS'; payload: { rooms: Room[] } }
  | { type: 'DELETE_ROOM'; payload: { roomId: number } }
  | { type: 'ADD_MESSAGES'; payload: { roomId: number; messages: Message[] } }
  | { type: 'SET_ROOM_MEMBER_COUNT'; payload: { roomId: number; version: number; memberCount: number } };

export interface ChatContextValue {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
}

// A device we register in Centrifugo PRO to deliver web push notifications.
export interface DeviceInfo {
  provider: string;
  token: string;
  platform: string;
  meta: Record<string, string>;
  timezone: string;
  // Centrifugo device id, saved after the first registration so subsequent
  // registrations update the same device in place instead of creating a new one.
  device_id?: string;
}
