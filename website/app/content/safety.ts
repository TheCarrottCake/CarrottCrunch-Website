/** Owner-approved Phase 6B public policy. No private staff or report data. */
export type SafetyRule = {title: string; paragraphs: readonly string[]};
export const safetyPolicy = {
  "intro": "CarrottCrunch is a place to hang out, make friends, play games, and have a good time. We're pretty laid-back, but a little common sense helps keep things enjoyable for everyone.",
  "rules": [
    {
      "title": "18+ Community",
      "paragraphs": [
        "CarrottCrunch is an 18+ community. Membership is intended for adults only."
      ]
    },
    {
      "title": "Respect Everyone",
      "paragraphs": [
        "Treat other members with respect.",
        "Friendly banter, playful teasing and joking around are welcome, but bullying, harassment, threats and deliberately making someone uncomfortable aren't.",
        "If someone asks you to stop, respect their boundaries."
      ]
    },
    {
      "title": "Swearing & Adult Humour",
      "paragraphs": [
        "Swearing, mature jokes, innuendos and playful trash talk are permitted.",
        "We're here to have fun, not police every word someone says.",
        "However, racism, hate speech, discriminatory slurs and targeted harassment are not tolerated, even when disguised as jokes.",
        "Unwanted sexual comments or advances toward other members are not acceptable.",
        "Explicit sexual content and pornography do not belong in general community channels."
      ]
    },
    {
      "title": "Exploits & Cheating",
      "paragraphs": [
        "Do not share, promote or encourage game-breaking exploits, cheating methods, duplication glitches or instructions for abusing bugs in public community channels.",
        "If you discover a serious exploit affecting a CarrottCrunch server, report it privately to staff instead."
      ]
    },
    {
      "title": "Don't Ruin the Fun",
      "paragraphs": [
        "Do not grief, deliberately sabotage other players or intentionally ruin their experience.",
        "Respect shared spaces and other players' progress."
      ]
    },
    {
      "title": "Privacy & Account Safety",
      "paragraphs": [
        "Respect other members' privacy.",
        "Do not publicly disclose personal information, private conversations or private messages without appropriate permission.",
        "Relevant evidence may be shared privately with authorized staff when reporting concerns.",
        "Never share or request passwords, authentication tokens or sensitive account credentials."
      ]
    },
    {
      "title": "Keep the Community Enjoyable",
      "paragraphs": [
        "Avoid spam, scams, malicious links, excessive unwanted pings and deliberate disruption of conversations or voice chats."
      ]
    }
  ],
  "minecraft": [
    "Respect other players and their builds.",
    "No griefing or deliberate sabotage.",
    "Avoid lag-heavy builds and machinery.",
    "Be considerate when building near other players or using shared spaces."
  ],
  "reporting": [
    "For general community concerns, contact a CarrottCrunch Moderator privately through Discord.",
    "If your concern involves a staff member, contact an Administrator or the Owner instead.",
    "Share what happened and any relevant information or screenshots you have. There's no need to confront someone or discuss the situation publicly.",
    "Please avoid sharing sensitive personal information, passwords or account tokens."
  ],
  "accountability": [
    "Rule violations are handled at the discretion of CarrottCrunch staff.",
    "We trust our Moderators and Administrators to use good judgment, consider the circumstances, and take whatever action is reasonably necessary to keep the community safe, respectful, and enjoyable.",
    "Not every situation is the same, and moderation decisions will reflect that. Serious violations may require immediate action without a prior warning.",
    "Our staff are accountable, too.",
    "If a moderation action appears unjustified, unfair, or an abuse of authority, concerns can be raised directly with an Administrator or the Owner.",
    "These concerns will be reviewed, and where an action is found to have been taken without reasonable justification, appropriate corrective steps will be considered.",
    "If an issue reveals weaknesses in how moderation is handled, we'll work to improve our procedures to help prevent similar situations in the future.",
    "Our goal isn't to punish people unnecessarily. It's to protect the community and keep things fair for everyone."
  ]
} as const satisfies {intro: string; rules: readonly SafetyRule[]; minecraft: readonly string[]; reporting: readonly string[]; accountability: readonly string[]};
