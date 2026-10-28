import type { Route } from "./+types/join";
import { CrunchMark } from "../components/community";
import { getDiscordInvite } from "../config/discord.server";
import {EditorialHeader} from '../components/public-page';
import '../public-v3.css';

export async function loader() {
  return { invite: await getDiscordInvite() };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Join Discord — CarrottCrunch" },
    { name: "description", content: "Join the CarrottCrunch community through our official Discord invitation." },
  ];
}

export default function Join({ loaderData }: Route.ComponentProps) {
  const { invite } = loaderData;
  return (
    <div className="public-v3"><a className="skip-link" href="#main">Skip to content</a><main id="main" tabIndex={-1} className="v3-container v3-page v3-join">
      <a className="brand" href="/" aria-label="CarrottCrunch home">
        <CrunchMark /> <span>CarrottCrunch</span>
      </a>
      <EditorialHeader eyebrow="GOOD COMPANY, ONE CHAT AWAY" title="Pull up a chair" accent="."/>
      <div className="v3-entry-content">
      {invite ? (
        <>
          <p>Continue to the official CarrottCrunch invitation on Discord. You can review the invitation there before joining.</p>
          <a className="button primary" href={invite} rel="noreferrer">Continue to Discord <span aria-hidden="true">↗</span></a>
          <p className="muted">If Discord doesn’t open, try the link again or check your connection. You can return to this page at any time.</p>
        </>
      ) : (
        <p>The official Discord invitation is currently unavailable. Please try again later.</p>
      )}
      <a className="button secondary" href="/">Back to CarrottCrunch</a>
      </div>
    </main></div>
  );
}
