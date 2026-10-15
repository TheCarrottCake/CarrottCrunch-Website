import { redirect } from 'react-router';
import { staffAuthHeaders } from '../lib/staff-auth.server';
/** Compatibility entry: one public sign-in experience for members and staff. */
export function loader() { return redirect('/login', { headers: staffAuthHeaders }); }
