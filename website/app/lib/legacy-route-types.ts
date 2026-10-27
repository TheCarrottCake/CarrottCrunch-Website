import type {RouterContextProvider} from 'react-router';
/** Type-only compatibility for historical route modules no longer registered by V2. */
export type LegacyArgs={request:Request;context:Readonly<RouterContextProvider>;params:Record<string,string>};
export type LegacyData<T>=T extends Response?never:T extends {data:infer D}?D:T;
