import { redirect } from 'react-router';
export function loader({ params }: {
    params: Record<string, string | undefined>;
}) { return redirect('/control/media'); }
