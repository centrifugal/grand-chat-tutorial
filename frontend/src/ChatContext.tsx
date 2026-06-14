import { createContext } from 'react';
import type { ChatContextValue } from './types';
import { initialChatState } from './types';

const ChatContext = createContext<ChatContextValue>({
  state: initialChatState,
  dispatch: () => undefined,
});

export default ChatContext;
