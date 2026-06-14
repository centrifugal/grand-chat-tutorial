import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import ChatContext from './ChatContext'

const ChatRoomList = () => {
  const { state } = useContext(ChatContext);

  return (
    <div id="chat-rooms">
      {state.rooms.map((roomId) => {
        const room = state.roomsById[roomId]
        if (!room) {
          return null
        }
        return <div className="chat-room-block" key={room.id}>
          <NavLink to={`/rooms/${room.id}`} className={({ isActive }) => isActive ? 'active-room' : ''}>
            <div className="left-column">
              <span className="name">{room.name}</span>
              <span className="message-content">
                {room.last_message ? (
                  <span>
                    <span className='message-content-author'>{room.last_message.user.username}:</span>
                    &nbsp;
                    {room.last_message.content}
                  </span>
                ) : (<></>)}
              </span>
            </div>
            <div className="right-column">
              <span className="chat-room-member-counter">{room.member_count}&nbsp;<span className="chat-room-member-counter-icon">🐈</span></span>
            </div>
          </NavLink>
        </div>
      })}
    </div>
  );
};

export default ChatRoomList;
