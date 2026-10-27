import { redirect } from 'react-router';
export function loader({ params }: {
    params: Record<string, string | undefined>;
}) { return redirect(params['*'] === 'new' ? '/control/posts/new/announcement' : params['*'] ? '/control/posts/' + params['*'] : '/control/posts'); }
