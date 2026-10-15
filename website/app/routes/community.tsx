import { PublicPage, publicMeta } from "../components/public-page";
import { publicPages } from "../content/public-pages";

export function meta() {
  return publicMeta(publicPages.community);
}

export default function Page() {
  return <PublicPage content={publicPages.community} />;
}
