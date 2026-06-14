import { useState, useContext } from 'react';
import axios from 'axios';
import logo from './assets/centrifugo.svg'
import CsrfContext from './CsrfContext';
import { login } from './AppApi';
import type { AuthInfo } from './types';

interface ChatLoginProps {
  onSuccess: (userInfo: AuthInfo) => void;
}

const ChatLogin: React.FC<ChatLoginProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const csrf = useContext(CsrfContext)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const userInfo = await login(csrf, username, password)
      onSuccess(userInfo);
    } catch (err) {
      // The backend returns a human-readable reason (e.g. "invalid credentials").
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Login failed, please try again.')
      }
    }
    setLoading(false)
  };

  return (
    <form id="chat-login" onSubmit={(e) => {
      e.preventDefault()
      handleLogin()
    }}>
      <div id="chat-login-logo-container">
        <img src={logo} width="100px" height="100px" />
      </div>
      <div className="input-container">
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      </div>
      <div className="input-container">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" />
      </div>
      {error && <div className="login-error">{error}</div>}
      <div className='login-button-container'>
        <button disabled={loading} className={`${(loading) ? 'loading' : ''}`}>Login</button>
      </div>
    </form>
  );
};

export default ChatLogin;
