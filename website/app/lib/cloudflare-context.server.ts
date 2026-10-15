import { createContext } from 'react-router';
import type { AuthEnvironment } from './staff-auth.server';
import type { ContentEnvironment } from './content-db.server';

/** Request-scoped Worker bindings for server loaders; never serialized to clients. */
export const contentEnvironmentContext = createContext<ContentEnvironment & AuthEnvironment>();
