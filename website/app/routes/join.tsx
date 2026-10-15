import type { Route } from "./+types/join";
import { CrunchMark } from "../components/community";
import { getDiscordInvite } from "../config/discord.server";

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
    <main id="main" className="container join-page">
      <a className="brand" href="/" aria-label="CarrottCrunch home">
        <CrunchMark /> <span>CarrottCrunch</span>
      </a>
      <div className="eyebrow">GOOD COMPANY, ONE CHAT AWAY</div>
      <h1>Pull up a chair<span>.</span></h1>
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
    </main>
  );
}
