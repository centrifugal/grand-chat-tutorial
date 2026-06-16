import React, { useState, useEffect, useReducer, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';

import ChatLogin from './ChatLogin';
import ChatRoomList from './ChatRoomList';
import ChatRoomDetail from './ChatRoomDetail';
import ChatLayout from './ChatLayout';
import CsrfContext from './CsrfContext';
import AuthContext from './AuthContext';
import ChatContext from './ChatContext';
import ChatSearch from './ChatSearch';
import {
  getConnectionToken, getSubscriptionToken, getCSRFToken,
  logout, addMessage, getRooms, getMessages, getRoom, registerDevice,
} from './AppApi';
import { WS_ENDPOINT, LOCAL_STORAGE_AUTH_INFO_KEY, LOCAL_STORAGE_DEVICE_ID_KEY, LOCAL_STORAGE_TWO_COLUMN_KEY } from './AppSettings';
import { initializeFirebase, requestNotificationToken, onForegroundNotification, removeNotificationToken } from './PushNotification';
import { initialChatState } from './types';
import type {
  AuthInfo, ChatAction, ChatState, DeviceInfo, Message, RealTimeEvent,
  Room, RoomMembership,
} from './types';

import { Centrifuge, SubscriptionState } from 'centrifuge';
import type { PublicationContext, SubscriptionStateContext, SubscribedContext } from 'centrifuge';

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'CLEAR_CHAT_STATE': {
      return initialChatState;
    }
    case 'ADD_ROOMS': {
      const newRooms = action.payload.rooms;

      // Update roomsById with new rooms, avoiding duplicates.
      const updatedRoomsById = { ...state.roomsById };
      newRooms.forEach((room) => {
        if (!updatedRoomsById[room.id]) {
          updatedRoomsById[room.id] = room;
        }
      });

      // Merge new room IDs with existing ones, filtering out duplicates.
      const mergedRoomIds = [...new Set([...newRooms.map((room) => room.id), ...state.rooms])];

      // Sort room IDs by the bumped_at field of their rooms, newest first.
      const sortedRoomIds = sortRoomIds(mergedRoomIds, updatedRoomsById);

      return {
        ...state,
        roomsById: updatedRoomsById,
        rooms: sortedRoomIds
      };
    }
    case 'DELETE_ROOM': {
      const roomId = action.payload.roomId;

      // Set the specified room to null instead of deleting it. This lets the
      // search screen keep its membership badge in sync.
      const newRoomsById = {
        ...state.roomsById,
        [roomId]: null
      };

      // Remove the room from the rooms array.
      const newRooms = state.rooms.filter((id) => id !== roomId);

      // Remove associated messages.
      const newMessagesByRoomId = { ...state.messagesByRoomId };
      delete newMessagesByRoomId[roomId];

      return {
        ...state,
        roomsById: newRoomsById,
        rooms: newRooms,
        messagesByRoomId: newMessagesByRoomId
      };
    }
    case 'ADD_MESSAGES': {
      const roomId = action.payload.roomId;
      const newMessages = action.payload.messages;
      const currentMessages = state.messagesByRoomId[roomId] || [];

      // Combine current and new messages, then filter out duplicates.
      const combinedMessages = [...currentMessages, ...newMessages].filter(
        (message, index, self) =>
          index === self.findIndex(m => m.id === message.id)
      );

      // Sort the combined messages by id in ascending order.
      combinedMessages.sort((a, b) => a.id - b.id);

      // Find the message with the highest ID.
      const lastMessage = combinedMessages.length > 0 ? combinedMessages[combinedMessages.length - 1] : null;

      let needSort = false;

      // Update the room's last_message and bumped_at if we got a newer message.
      const updatedRoomsById = { ...state.roomsById };
      const room = updatedRoomsById[roomId];
      if (lastMessage && room && (!room.last_message || lastMessage.id > room.last_message.id)) {
        updatedRoomsById[roomId] = {
          ...room,
          last_message: lastMessage,
          bumped_at: lastMessage.room.bumped_at,
        };
        needSort = true;
      }

      const updatedRooms = needSort ? sortRoomIds(state.rooms, updatedRoomsById) : state.rooms;

      return {
        ...state,
        messagesByRoomId: {
          ...state.messagesByRoomId,
          [roomId]: combinedMessages
        },
        roomsById: updatedRoomsById,
        rooms: updatedRooms,
      };
    }
    case 'SET_ROOM_MEMBER_COUNT': {
      const { roomId, version, memberCount } = action.payload;

      const room = state.roomsById[roomId];
      if (!room) {
        console.error(`Room with ID ${roomId} not found.`);
        return state;
      }

      // Ignore events older than the state we already have.
      if (version <= room.version) {
        console.error(`Outdated version for room ID ${roomId}.`);
        return state;
      }

      return {
        ...state,
        roomsById: {
          ...state.roomsById,
          [roomId]: { ...room, member_count: memberCount, version: version },
        },
      };
    }
    default:
      return state;
  }
}

// Sort room IDs by their room's bumped_at field, newest first. RFC 3339 date
// strings are directly comparable, so we can compare them without parsing.
function sortRoomIds(roomIds: number[], roomsById: Record<number, Room | null>): number[] {
  return [...roomIds].sort((a, b) => {
    const roomA = roomsById[a];
    const roomB = roomsById[b];
    if (!roomA || !roomB) return 0;
    return roomB.bumped_at.localeCompare(roomA.bumped_at);
  });
}

const App: React.FC = () => {
  let localAuth: AuthInfo = {};
  if (localStorage.getItem(LOCAL_STORAGE_AUTH_INFO_KEY)) {
    localAuth = JSON.parse(localStorage.getItem(LOCAL_STORAGE_AUTH_INFO_KEY)!)
  }
  const [authenticated, setAuthenticated] = useState<boolean>(localAuth.id !== undefined);
  const [userInfo, setUserInfo] = useState<AuthInfo>(localAuth);
  const [csrf, setCSRF] = useState('');
  const [unrecoverableError, setUnrecoverableError] = useState('')
  const [chatState, dispatch] = useReducer(reducer, initialChatState);
  const [connected, setConnected] = useState(false)
  // Whether to show the messenger-style two-column layout (room list + open room side by
  // side). Persisted so the choice sticks across reloads.
  const [twoColumn, setTwoColumn] = useState<boolean>(localStorage.getItem(LOCAL_STORAGE_TWO_COLUMN_KEY) === 'true')

  const toggleColumns = () => {
    setTwoColumn(prev => {
      const next = !prev
      localStorage.setItem(LOCAL_STORAGE_TWO_COLUMN_KEY, String(next))
      return next
    })
  }

  // The Centrifugo subscription is created once (when we connect) and lives for the whole
  // session, so its publication callback would close over a stale chatState. We keep the
  // latest state in a ref and read chatStateRef.current inside the handlers below.
  const chatStateRef = useRef(chatState);
  useEffect(() => {
    chatStateRef.current = chatState;
  }, [chatState]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }
    if (!csrf) { // User is authenticated from local storage but CSRF token is not yet fetched.
      return;
    }
    const push = userInfo.settings?.push_notifications;
    if (!push || !push.enabled) {
      return;
    }
    const setupNotifications = async () => {
      initializeFirebase(push.firebase_config);
      const token = await requestNotificationToken(push.vapid_public_key);

      if (!token) {
        console.warn('No token received, cannot proceed.');
        return;
      }

      const deviceInfo: DeviceInfo = {
        provider: 'fcm',
        token: token,
        platform: 'web',
        meta: { 'user-agent': navigator.userAgent },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const storedDeviceId = localStorage.getItem(LOCAL_STORAGE_DEVICE_ID_KEY);
      if (storedDeviceId) {
        deviceInfo.device_id = storedDeviceId;
      }
      try {
        const response = await registerDevice(csrf, deviceInfo);
        localStorage.setItem(LOCAL_STORAGE_DEVICE_ID_KEY, response.device_id);
        onForegroundNotification((payload) => {
          console.log('Message received in foreground:', payload);
          // We ignore foreground messages since we receive them over the Centrifugo WebSocket.
        });
      } catch (error) {
        console.error('Failed to send token to server:', error);
      }
    };

    setupNotifications();
  }, [authenticated, userInfo, csrf]);

  const processMessageAdded = async (body: Message) => {
    const roomId = body.room.id
    if (!chatStateRef.current.roomsById[roomId]) {
      const room = await fetchRoom(String(roomId))
      if (room) {
        dispatch({ type: "ADD_ROOMS", payload: { rooms: [room] } })
      }
    }
    if (!chatStateRef.current.messagesByRoomId[roomId]) {
      // First time we see this room – load its history (which already includes this message).
      const messages = await fetchMessages(String(roomId))
      if (messages) {
        dispatch({ type: "ADD_MESSAGES", payload: { roomId: roomId, messages: messages } })
      }
      return
    }
    dispatch({ type: "ADD_MESSAGES", payload: { roomId: roomId, messages: [body] } })
  }

  const processUserJoined = async (body: RoomMembership) => {
    const roomId = body.room.id
    if (!chatStateRef.current.roomsById[roomId]) {
      const room = await fetchRoom(String(roomId))
      if (room) {
        dispatch({ type: "ADD_ROOMS", payload: { rooms: [room] } })
      }
    } else {
      dispatch({
        type: "SET_ROOM_MEMBER_COUNT", payload: {
          roomId: roomId,
          version: body.room.version,
          memberCount: body.room.member_count
        }
      })
    }
  }

  const processUserLeft = async (body: RoomMembership) => {
    const roomId = body.room.id
    const room = chatStateRef.current.roomsById[roomId]
    if (room) {
      if (body.room.version <= room.version) {
        return // Outdated event – we already have a newer version of this room.
      }
      if (userInfo.id === body.user.id) {
        dispatch({ type: "DELETE_ROOM", payload: { roomId: roomId } })
      } else {
        dispatch({
          type: "SET_ROOM_MEMBER_COUNT", payload: {
            roomId: roomId,
            version: body.room.version,
            memberCount: body.room.member_count
          }
        })
      }
    } else if (userInfo.id !== body.user.id) {
      const room = await fetchRoom(String(roomId))
      if (room) {
        dispatch({ type: "ADD_ROOMS", payload: { rooms: [room] } })
      }
    }
  }

  // Centrifugo delivers every event for the current user on their personal channel. We handle
  // events as they arrive – no queue needed: reducer updates are idempotent and every event
  // carries a room version, so duplicate or out-of-order events are handled safely.
  const onPublication = (event: RealTimeEvent) => {
    switch (event.type) {
      case 'message_added':
        processMessageAdded(event.body)
        break
      case 'user_joined':
        processUserJoined(event.body)
        break
      case 'user_left':
        processUserLeft(event.body)
        break
    }
  }

  useEffect(() => {
    if (!userInfo.id) {
      return;
    }

    // Load the initial room list. Real-time events that arrive before this completes are
    // still handled correctly – the handlers fetch a room on demand if we don't have it yet.
    fetchRooms().then(rooms => {
      if (rooms) {
        dispatch({ type: 'ADD_ROOMS', payload: { rooms } })
      }
    })

    const personalChannel = 'personal:' + userInfo.id

    // Create the client synchronously (not inside an async function) so the cleanup below
    // always has it to disconnect – even if this effect is torn down before async work runs.
    const centrifuge = new Centrifuge(WS_ENDPOINT, {
      getToken: getConnectionToken,
      debug: true
    })

    const sub = centrifuge.newSubscription(personalChannel, {
      getToken: () => getSubscriptionToken(personalChannel)
    })
    sub.on('publication', (ctx: PublicationContext) => {
      onPublication(ctx.data)
    }).on('subscribed', (ctx: SubscribedContext) => {
      if (ctx.wasRecovering && !ctx.recovered) {
        setUnrecoverableError('State LOST - please reload the page')
      }
    })
    sub.on('state', (ctx: SubscriptionStateContext) => {
      setConnected(ctx.newState === SubscriptionState.Subscribed)
    })

    sub.subscribe()
    centrifuge.connect()

    return () => {
      centrifuge.disconnect()
    }
  }, [userInfo])

  useEffect(() => {
    const fetchCSRF = async () => {
      const token = await getCSRFToken()
      setCSRF(token)
    }
    fetchCSRF();
  }, []);

  // All our API wrappers handle errors the same way: a 403 means the session is gone (log
  // out), a 404 means the resource isn't available to us (just return null), anything else
  // is unexpected. The caller always gets null on error.
  const handleApiError = (err: unknown): null => {
    if (axios.isAxiosError(err) && err.response) {
      if (err.response.status === 403) {
        onLoggedOut()
        return null
      }
      if (err.response.status === 404) {
        return null
      }
    }
    setUnrecoverableError('Unhandled error - please reload a page')
    return null
  }

  const publishMessage = async (roomId: string, content: string): Promise<Message | null> => {
    try {
      return await addMessage(csrf, roomId, content)
    } catch (err) {
      return handleApiError(err)
    }
  }

  const fetchMessages = async (roomId: string): Promise<Message[] | null> => {
    try {
      const messages = await getMessages(roomId)
      // Reverse since the API returns newest first, but we display oldest on top.
      return messages.reverse()
    } catch (err) {
      return handleApiError(err)
    }
  };

  const fetchRoom = async (roomId: string): Promise<Room | null> => {
    try {
      return await getRoom(roomId)
    } catch (err) {
      return handleApiError(err)
    }
  };

  const fetchRooms = async (): Promise<Room[] | null> => {
    try {
      return await getRooms()
    } catch (err) {
      return handleApiError(err)
    }
  };

  const onLoginSuccess = async (userInfo: AuthInfo) => {
    setUserInfo(userInfo);
    localStorage.setItem(LOCAL_STORAGE_AUTH_INFO_KEY, JSON.stringify(userInfo));
    const token = await getCSRFToken()
    setCSRF(token)
    setAuthenticated(true);
  }

  const onLoggedOut = async () => {
    setAuthenticated(false)
    setUnrecoverableError('')
    setUserInfo({});
    dispatch({ type: "CLEAR_CHAT_STATE" })
    localStorage.removeItem(LOCAL_STORAGE_AUTH_INFO_KEY);
    localStorage.removeItem(LOCAL_STORAGE_DEVICE_ID_KEY);
    await removeNotificationToken();
  }

  const onLogout = async () => {
    try {
      await logout(csrf, localStorage.getItem(LOCAL_STORAGE_DEVICE_ID_KEY) || '')
      await onLoggedOut()
      const token = await getCSRFToken()
      setCSRF(token)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status == 403) {
          await onLoggedOut()
          return
        }
      }
      setUnrecoverableError('Unhandled error - please reload a page')
    }
  }

  // The routed screens. In two-column mode the room list is rendered in the sidebar, so the
  // "/" route just shows a placeholder prompting the user to pick a room.
  const screens = (
    <Routes>
      <Route path="/" element={twoColumn ? <div id="chat-room-placeholder">Select a room to start chatting</div> : <ChatRoomList />} />
      <Route path="/search" element={<ChatSearch fetchRoom={fetchRoom} />} />
      <Route path="/rooms/:id" element={
        <ChatRoomDetail
          fetchRoom={fetchRoom}
          fetchMessages={fetchMessages}
          publishMessage={publishMessage}
        />
      } />
    </Routes>
  )

  return (
    <CsrfContext.Provider value={csrf}>
      <AuthContext.Provider value={userInfo}>
        {authenticated ? (
          <ChatContext.Provider value={{ state: chatState, dispatch }}>
            <Router>
              <ChatLayout
                connected={connected}
                unrecoverableError={unrecoverableError}
                onLogout={onLogout}
                twoColumn={twoColumn}
                onToggleColumns={toggleColumns}
              >
                {/* In two-column mode the room list lives in a persistent sidebar, and the
                    routed screen is shown in the main pane next to it. Both panes read from
                    the same chat state fed by our single personal-channel subscription, so
                    they update live together. */}
                {twoColumn ? (
                  <div id="chat-columns">
                    <div id="chat-sidebar">
                      <ChatRoomList />
                    </div>
                    <div id="chat-main">
                      {screens}
                    </div>
                  </div>
                ) : (
                  screens
                )}
              </ChatLayout>
            </Router>
          </ChatContext.Provider>
        ) : (
          <ChatLogin onSuccess={onLoginSuccess} />
        )}
      </AuthContext.Provider>
    </CsrfContext.Provider>
  );
};

export default App;
