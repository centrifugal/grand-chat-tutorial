import { useState, useEffect, useContext, useRef } from 'react';
import type { UIEvent } from 'react';
import { useParams } from 'react-router-dom';
import AuthContext from './AuthContext';
import ChatContext from './ChatContext';
import type { Message, Room } from './types';

interface ChatRoomDetailProps {
  fetchRoom: (roomId: string) => Promise<Room | null>
  fetchMessages: (roomId: string) => Promise<Message[] | null>
  publishMessage: (roomId: string, content: string) => Promise<Message | null>
}

const ChatRoomDetail: React.FC<ChatRoomDetailProps> = ({ fetchRoom, fetchMessages, publishMessage }) => {
  const { id } = useParams() as { id: string };
  const roomId = Number(id);
  const userInfo = useContext(AuthContext);
  const { state, dispatch } = useContext(ChatContext);
  const [content, setContent] = useState('')
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [roomLoading, setRoomLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [notFound, setNotFound] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the messages container.

  useEffect(() => {
    if (messagesLoading) return
    const init = async () => {
      setMessagesLoading(true)
      if (!state.messagesByRoomId[roomId]) {
        const messages = await fetchMessages(id)
        if (messages === null) {
          setNotFound(true);
        } else {
          setNotFound(false);
          dispatch({
            type: "ADD_MESSAGES", payload: {
              roomId: roomId,
              messages: messages
            }
          })
        }
      }
      setMessagesLoading(false)
    }
    init()
  }, [id, roomId, state.messagesByRoomId, fetchMessages]);

  useEffect(() => {
    if (roomLoading) return
    const init = async () => {
      setRoomLoading(true)
      if (!state.roomsById[roomId]) {
        const room = await fetchRoom(id)
        if (room === null) {
          setNotFound(true);
        } else {
          setNotFound(false);
          dispatch({
            type: "ADD_ROOMS", payload: {
              rooms: [room],
            }
          })
        }
      }
      setRoomLoading(false)
    }
    init()
  }, [id, roomId, state.roomsById, fetchRoom]);

  const room = state.roomsById[roomId];
  const messages = state.messagesByRoomId[roomId] || [];

  const scrollToBottom = () => {
    const container = messagesEndRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
    }
  };

  const getTime = (timeString: string) => {
    const date = new Date(timeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sendLoading) {
      return
    }
    setSendLoading(true)
    try {
      const message = await publishMessage(id, content)
      if (message) {
        dispatch({
          type: "ADD_MESSAGES", payload: {
            roomId: roomId,
            messages: [message]
          }
        })
        setContent('')
      }
    } catch (e) {
      console.log(e)
    }
    setSendLoading(false)
  }

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const container = e.target as HTMLElement;
    if (!container) return;
    const threshold = 40; // Pixels from the bottom to be considered 'near bottom'.
    const position = container.scrollTop + container.offsetHeight;
    const height = container.scrollHeight;
    setIsAtBottom(position + threshold >= height)
  };

  // Scroll to bottom after layout changes – but only if the user is already near
  // the bottom, so we don't yank them down while they're reading older messages.
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  return (
    <div id="chat-room">
      {notFound ? (
        <div id="room-not-found">
          NOT A MEMBER OF THIS ROOM
        </div>
      ) : (
        <>
          <div id="room-description">
            <span id="room-name">{room?.name}</span>
            <span id="room-member-count">{room?.member_count} <span className='chat-room-member-counter-icon'>🐈</span></span>
          </div>
          <div id="room-messages" onScroll={handleScroll} ref={messagesEndRef}>
            {messages.map((message) => (
              <div key={message.id} className={`room-message ${(userInfo.id == message.user.id) ? 'room-message-mine' : 'room-message-not-mine'}`}>
                <div className='message-avatar'>
                  <img src={`https://robohash.org/user${message.user.id}.png?set=set4`} alt="" />
                </div>
                <div className='message-bubble'>
                  <div className='message-meta'>
                    <div className='message-author'>
                      {message.user.username}
                    </div>
                    <div className='message-time'>
                      {getTime(message.created_at)}
                    </div>
                  </div>
                  <div className='message-content'>
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div id="chat-input-container" className={`${(sendLoading) ? 'loading' : ''}`}>
            <form onSubmit={onFormSubmit}>
              <input type="text" autoComplete="off" value={content} placeholder="Enter message..." onChange={e => setContent(e.currentTarget.value)} required />
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatRoomDetail;
