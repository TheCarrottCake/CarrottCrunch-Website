import {Link} from 'react-router';
import { PublicPage, publicMeta } from "../components/public-page";
import { publicPages } from "../content/public-pages";

export function meta() {
  return publicMeta(publicPages.community);
}

export default function Page() {
  return <PublicPage content={publicPages.community}><p className="v3-page-context"><Link className="text-link" to="/community/staff">Meet the staff who have chosen to share a profile</Link></p></PublicPage>;
}
