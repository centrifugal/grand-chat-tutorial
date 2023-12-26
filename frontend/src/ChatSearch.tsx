import { useState, useEffect, useContext } from 'react';
import CsrfContext from './CsrfContext';
import ChatContext from './ChatContext';
import { joinRoom, leaveRoom, searchRooms } from './AppApi';

interface ChatSearchProps {
  fetchRoom: (roomId: string) => Promise<void>
}

const ChatSearch: React.FC<ChatSearchProps> = ({ fetchRoom }) => {
  const csrf = useContext(CsrfContext);
  const { state, dispatch } = useContext(ChatContext);
  const [rooms, setRooms] = useState<any>([]);
  const [loading, setLoading] = useState<any>({})

  const setLoadingFlag = (roomId: any, value: boolean) => {
    setLoading((prev: any) => ({
      ...prev,
      [roomId]: value
    }));
  };

  const onJoin = async (roomId: any) => {
    setLoadingFlag(roomId, true)
    try {
      await joinRoom(csrf, roomId)
      const room = await fetchRoom(roomId)
      dispatch({
        type: "ADD_ROOMS", payload: {
          rooms: [room]
        }
      })
      setRooms(rooms.map((room: any) => 
        room.id === roomId
          ? { ...room, is_member: true }
          : room
      ))
    } catch (e) {
      console.log(e)
    }
    setLoadingFlag(roomId, false)
  };

  const onLeave = async (roomId: any) => {
    setLoadingFlag(roomId, true)
    try {
      await leaveRoom(csrf, roomId)
      dispatch({
        type: "DELETE_ROOM", payload: {
          roomId: roomId
        }
      })
      setRooms(rooms.map((room: any) => 
        room.id === roomId
          ? { ...room, is_member: false }
          : room
      ))
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
      {rooms.map((room: any) => {
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
