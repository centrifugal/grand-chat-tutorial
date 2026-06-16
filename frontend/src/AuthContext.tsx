import { createContext } from 'react';
import type { AuthInfo } from './types';

const AuthContext = createContext<AuthInfo>({});

export default AuthContext;
