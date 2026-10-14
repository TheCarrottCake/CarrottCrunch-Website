type DiscordWidgetProps = {
  serverId: string;
  title?: string;
};

/** Discord's public, hosted widget; no bot credentials or private API access. */
export function DiscordWidget({
  serverId,
  title = "CarrottCrunch Discord community widget",
}: DiscordWidgetProps) {
  return (
    <div className="discord-widget">
      <iframe
        src={`https://discord.com/widget?id=${encodeURIComponent(serverId)}&theme=dark`}
        title={title}
        width="350"
        height="500"
        loading="lazy"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
      />
    </div>
  );
}
