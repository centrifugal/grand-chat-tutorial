import { useContext } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import AuthContext from './AuthContext';

interface ChatLayoutProps {
  children: ReactNode
  connected: boolean
  unrecoverableError: string
  onLogout: () => void
  twoColumn: boolean
  onToggleColumns: () => void
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ children, connected, unrecoverableError, onLogout, twoColumn, onToggleColumns }) => {
  const userInfo = useContext(AuthContext);

  return (
    <div id='chat-layout'>
      <div id='chat-navbar'>
        <NavLink to={`/`} className={({ isActive }) => isActive ? "navbar-active-link" : ""}>My rooms</NavLink>
        <NavLink to={`/search`} className={({ isActive }) => isActive ? "navbar-active-link" : ""}>Discover</NavLink>
        <span id="logout-container">
          <button id="layout-toggle" className={twoColumn ? 'active' : ''} onClick={onToggleColumns} title="Toggle two-column layout">
            Split view
          </button>
          <span id="status" className={connected ? 'status-connected' : 'status-disconnected'}>{connected ? '🟢' : '🔴'}</span>
          <span id="user">{userInfo.username}</span>
          <a href='#' id="logout-button" onClick={(e) => { e.preventDefault(); onLogout() }}>
            Logout
          </a>
        </span>
      </div>
      {unrecoverableError != '' ? (
        <div id='chat-state-lost'>
          {unrecoverableError}
        </div>
      ) : (
        <div id='chat-content'>
          {children}
        </div>
      )}
    </div>
  );
}

export default ChatLayout;
