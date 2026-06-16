import { useState, useEffect, useContext } from 'react';
import CsrfContext from './CsrfContext';
import ChatContext from './ChatContext';
import { joinRoom, leaveRoom, searchRooms } from './AppApi';
import type { Room, RoomSearchResult } from './types';

interface ChatSearchProps {
  fetchRoom: (roomId: string) => Promise<Room | null>
}

const ChatSearch: React.FC<ChatSearchProps> = ({ fetchRoom }) => {
  const csrf = useContext(CsrfContext);
  const { state, dispatch } = useContext(ChatContext);
  const [rooms, setRooms] = useState<RoomSearchResult[]>([]);
  const [loading, setLoading] = useState<Record<number, boolean>>({})

  const setLoadingFlag = (roomId: number, value: boolean) => {
    setLoading((prev) => ({
      ...prev,
      [roomId]: value
    }));
  };

  const onJoin = async (roomId: number) => {
    setLoadingFlag(roomId, true)
    try {
      await joinRoom(csrf, String(roomId))
      const room = await fetchRoom(String(roomId))
      if (room) {
        dispatch({ type: "ADD_ROOMS", payload: { rooms: [room] } })
      }
    } catch (e) {
      console.log(e)
    }
    setLoadingFlag(roomId, false)
  };

  const onLeave = async (roomId: number) => {
    setLoadingFlag(roomId, true)
    try {
      await leaveRoom(csrf, String(roomId))
      dispatch({ type: "DELETE_ROOM", payload: { roomId: roomId } })
    } catch (e) {
      console.log(e)
    }
    setLoadingFlag(roomId, false)
  };

  useEffect(() => {
    const fetchRooms = async () => {
      const rooms = await searchRooms()
      setRooms(rooms)
    };
    fetchRooms();
  }, []);

  return (
    <div id="chat-rooms">
      {rooms.map((room) => {
        // roomsById tells us the live membership state: a Room object means the
        // user is a member, an explicit null means they have left, and undefined
        // means we have no real-time info yet – so fall back to the search result.
        const roomState = state.roomsById[room.id]
        let isMember: boolean;
        if (roomState === null) {
          isMember = false
        } else if (roomState !== undefined) {
          isMember = true
        } else {
          isMember = room.is_member
        }
        return <div className={`chat-room-block ${(isMember) ? 'member' : 'not-member'}`} key={room.id}>
          <div className='room-search-item'>
            <span>
              {room.name}
            </span>
            <span className="room-actions">
              <button disabled={loading[room.id] === true} className={`${(isMember) ? 'member' : 'not-member'} ${(loading[room.id]) ? 'loading' : ''}`} onClick={() => {
                if (isMember) {
                  onLeave(room.id)
                } else {
                  onJoin(room.id)
                }
              }}>
                {(isMember) ? 'Leave' : 'Join'}
              </button>
            </span>
          </div>
        </div>
      })}
    </div>
  );
};

export default ChatSearch;
