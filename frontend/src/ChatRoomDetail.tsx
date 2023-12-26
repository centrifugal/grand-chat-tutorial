import { useState, useEffect, useContext, useRef, UIEvent } from 'react';
import { useParams } from 'react-router-dom';
import AuthContext from './AuthContext';
import ChatContext from './ChatContext';

interface ChatRoomDetailProps {
  fetchRoom: (roomId: string) => Promise<void>
  fetchMessages: (roomId: string) => Promise<any[]>
  publishMessage: (roomId: string, content: string) => Promise<boolean>
}

const ChatRoomDetail: React.FC<ChatRoomDetailProps> = ({ fetchRoom, fetchMessages, publishMessage }) => {
  const { id } = useParams() as { id: string };
  const userInfo = useContext(AuthContext);
  const { state, dispatch } = useContext(ChatContext);
  const [content, setContent] = useState('')
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [roomLoading, setRoomLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (messagesLoading) return
    const init = async () => {
      setMessagesLoading(true)
      if (!state.messagesByRoomId[id]) {
        const messages = await fetchMessages(id)
        if (messages === null) {
          setNotFound(true);
        } else {
          setNotFound(false);
          dispatch({
            type: "ADD_MESSAGES", payload: {
              roomId: id,
              messages: messages
            }
          })
        }
      }
      setMessagesLoading(false)
    }
    init()
  }, [id, state.messagesByRoomId, fetchMessages]);

  useEffect(() => {
    if (roomLoading) return
    const init = async () => {
      setRoomLoading(true)
      if (!state.roomsById[id]) {
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
  }, [id, state.roomsById, fetchRoom]);

  const room = state.roomsById[id] || {};
  const messages = state.messagesByRoomId[id] || [];

  const messagesEndRef = useRef<any>(null); // Ref for the messages container

  const scrollToBottom = () => {
    const container = messagesEndRef.current;
    if (container) {
      const scrollOptions = {
        top: container.scrollHeight,
        behavior: 'auto'
      };
      container.scrollTo(scrollOptions);
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
      const message = await publishMessage(id!, content)
      dispatch({
        type: "ADD_MESSAGES", payload: {
          roomId: id,
          messages: [message]
        }
      })
      setContent('')
    } catch (e) {
      console.log(e)
    }
    setSendLoading(false)
  }

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const container = (e.target as HTMLElement);
    if (!container) return;
    const threshold = 40; // Pixels from the bottom to be considered 'near bottom'
    const position = container.scrollTop + container.offsetHeight;
    const height = container.scrollHeight;
    setIsAtBottom(position + threshold >= height)
  };

  const [isAtBottom, setIsAtBottom] = useState(true);

  // Scroll to bottom after layout changes.
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]); // Dependency on messages ensures it runs after messages are updated.

  return (
    <div id="chat-room">
      {notFound ? (
        <div id="room-not-found">
          NOT A MEMBER OF THIS ROOM
        </div>
      ) : (
        <>
          <div id="room-description">
            <span id="room-name">{room.name}</span>
            <span id="room-member-count">{room.member_count} <span className='chat-room-member-counter-icon'>🐈</span></span>
          </div>
          <div id="room-messages" onScroll={handleScroll} ref={messagesEndRef}>
            {messages.map((message: any) => (
              <div key={message.id} className={`room-message ${(userInfo.id == message.user.id) ? 'room-message-mine' : 'room-message-not-mine'}`}>
                <div className='message-avatar'>
                  <img src={`https://robohash.org/user${message.user.id}.png?set=set4`} alt="" />
                  {/* <img src={`https://ui-avatars.com/api/?background=random&color=fff&name=${message.user.username}&size=128`} alt="" /> */}
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
