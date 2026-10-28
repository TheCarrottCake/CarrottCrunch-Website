import { data, Link } from "react-router";
import type { Route } from "./+types/home";
import {CommunityHero} from "../components/community-hero";
import { DiscordWidget } from "../components/discord-widget";
import { CrunchMark, FeatureCard, SectionHeading, type FeatureCardProps } from "../components/community";

import { loadPublicContent } from "../lib/public-content.server";
import { ContentAvailability, DemonstrationNotice, EventCard, NewsItem } from "../components/news-events";

export function headers() {
  return { "Cache-Control": "no-store" };
}

export async function loader({ context }: Route.LoaderArgs) {
  return data(await loadPublicContent(context, true), { headers: { "Cache-Control": "no-store" } });
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: "CarrottCrunch — Find your people. Build your world." }, { name: "description", content: "An established Discord community, a modded Minecraft Create server, and good company. Explore CarrottCrunch." }, ...(loaderData?.demonstration ? [{ name: "robots", content: "noindex, nofollow" }] : [])];
}
const features: FeatureCardProps[] = [
  { icon: "✳", accent: "orange", name: "Your kind of people", text: "A space for shared interests, friendly conversation, and turning a familiar username into a friend.", tag: "COMMUNITY FIRST" },
  { icon: "▧", accent: "green", name: "Make your mark", text: "From a cozy starter home to an ambitious world, there’s always room for your imagination.", tag: "BUILT TOGETHER" },
  { icon: "⚑", accent: "coral", name: "More than a game", text: "A home for spontaneous adventures, creative challenges, and the stories you’ll keep retelling.", tag: "MEMORIES INCLUDED" },
];
// Match the existing 240px banner preview cap while reserving its width before decode.
export default function Home({ loaderData }: Route.ComponentProps) {
  const { announcements, events, now, demonstration, availability } = loaderData;
  return <>{loaderData.banners.map(banner=><aside className="container public-card" key={banner.id}><img className="upload-local-preview" src={banner.image} alt={banner.alt} width={banner.width || undefined} height={banner.height || undefined} style={banner.width > 0 && banner.height > 0 ? {width: Math.min(banner.width, banner.width * 240 / banner.height)} : undefined} decoding="async"/>{banner.title&&<h2>{banner.title}</h2>}{banner.description&&<p>{banner.description}</p>}{banner.link&&<Link className="text-link" to={banner.link}>{banner.linkText||'Learn more'}</Link>}{banner.credit&&<p>{banner.credit}{banner.creditSource&&<> | <a href={banner.creditSource} rel="noreferrer">Source</a></>}</p>}</aside>)}<CommunityHero slides={loaderData.showcase}/><div className="hero-caption container"><span>A place to play. A place to belong.</span><span>SCROLL TO EXPLORE <span className="orange">↓</span></span></div><section id="community" className="container section"><SectionHeading number="01" eyebrow="THE CARROTTCRUNCH WAY" title="Come for the games. Stay for the people."><p>No matter your playstyle,<br/>there’s a place for you here.</p></SectionHeading><div className="feature-grid">{features.map(feature => <FeatureCard key={feature.name} {...feature}/>)}</div></section><section id="hangout" className="container section" aria-labelledby="hangout-title">
  <div className="hangout-grid">
    <div className="hangout-copy">
      <div className="eyebrow"><span className="section-number">02 /</span> GOOD COMPANY, ONE CHAT AWAY</div>
      <h2 id="hangout-title">The Hangout<span className="orange">.</span></h2>
      <p className="hangout-lead">Your people. Your next adventure. A place to say hey.</p>
      <p>CarrottCrunch already has a home on Discord. Come talk games, swap ideas for your next Create build, or just pull up a chair and get to know the community.</p>
      <div className="hangout-sticker"><CrunchMark/><span>Good games. Great company.</span></div>
      <p className="hangout-note">This is our official Discord widget. If it’s unavailable, try again later. You can also use the official Discord invitation below.</p>
    </div>
    <DiscordWidget serverId="1449232300758929513"/>
  </div>
</section><section id="gallery" className="container section"><SectionHeading number="03" eyebrow="A GLIMPSE OF THE POSSIBILITIES" title="Small blocks. Big imagination."><Link className="text-link" to="/gallery">Community Creations</Link></SectionHeading><div className="gallery-grid"><article className="gallery-card gallery-wide"><div className="gallery-art forest"/><div className="gallery-copy"><span className="micro">CONCEPT ART / EXPLORATION</span><h3>Take the scenic route.</h3><span>There’s a whole world out there. ↗</span></div></article><article className="gallery-card"><div className="gallery-art sunset"/><div className="gallery-copy"><span className="micro">CONCEPT ART / CREATIVE</span><h3>Dream it. Build it.</h3><span>Your next idea starts with one block. ↗</span></div></article></div><p className="section-note">Illustrated concept previews. Visit Community Creations for published gallery images.</p></section><section className="container section updates-grid"><div id="news"><SectionHeading number="04" eyebrow="FROM THE COMMUNITY" title="Fresh from the patch."/><DemonstrationNotice enabled={demonstration}/><ContentAvailability availability={availability}/>{announcements.map(article => <NewsItem key={article.id} article={article} compact/>)}{availability === "ready" && announcements.length === 0 && <p className="content-empty">No published news yet.</p>}<div className="homepage-events"><h3>Upcoming events</h3>{events.map(event => <EventCard key={event.id} event={event} now={now} compact/>)}{availability === "ready" && events.length === 0 && <p className="content-empty">No upcoming events published.</p>}</div><div className="news-note"><Link to="/updates">All news & events <span aria-hidden="true">↗</span></Link></div></div><aside id="server" className="server-card"><div className="server-top"><span className="eyebrow">MINECRAFT · CREATE</span><span className="status-badge">LIVE STATUS DISABLED</span></div><div className="server-icon" aria-hidden="true">⚙ <span>WORKSHOP / CREATE</span></div><h2>A little ingenuity.<br/>A lot of Create.</h2><p>Our modded Minecraft Create server is already part of CarrottCrunch. Think gears, moving machinery, and builds powered by imagination.</p><div className="server-details"><span>Server type</span><strong>Modded Minecraft · Create</strong></div><div className="server-details"><span>Connection details</span><strong>Not published here yet</strong></div><span className="server-pending">Connection details coming soon <span>↗</span></span><p className="server-disclaimer">Live Minecraft server status is disabled.</p></aside></section><section id="join" className="container join-section"><CrunchMark className="join-decoration"/><div><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h2>Pull up a chair.<br/>Bring a little <span>crunch.</span></h2><p>Our established Discord community is a place to connect, plan, and hang out.</p></div><div className="join-action"><Link className="button primary" to="/join">Join Discord <span>↗</span></Link><span>Continue to our official Discord invitation.</span></div></section></>;
}
