/** Original CSS genre compositions only. No game images, logos or activity tracking. */
export type GameId = 'minecraft' | 'repo' | 'phasmophobia' | 'overwatch' | 'roblox' | 'satisfactory';
export type GameTheme = 'blocks' | 'cargo' | 'radar' | 'team' | 'modules' | 'conveyor';
export type CommunityGame = {
  id: GameId; title: string; genres: readonly string[]; description: string; theme: GameTheme;
  hostedServer?: {label: string; href: '/servers/create'};
};
export const communityGames: readonly CommunityGame[] = [
  {id:'minecraft',title:'Minecraft',genres:['Sandbox','Survival','Building'],description:'One more block, one more idea. Make something of your own, or build it together.',theme:'blocks',hostedServer:{label:"CarrottCrunch-hosted Create server",href:'/servers/create'}},
  {id:'repo',title:'R.E.P.O.',genres:['Co-op','Horror'],description:'Bring a team. Try to bring the valuables back in one piece. Composure is optional.',theme:'cargo'},
  {id:'phasmophobia',title:'Phasmophobia',genres:['Co-op','Ghost hunting'],description:'Gather clues, compare notes, and decide who is brave enough to check that noise.',theme:'radar'},
  {id:'overwatch',title:'Overwatch',genres:['Competitive','Team shooter'],description:'Find your role, back up your team, and give the next round another go.',theme:'team'},
  {id:'roblox',title:'Roblox',genres:['Social','Variety'],description:'Different experiences, familiar company. See where the next group adventure takes you.',theme:'modules'},
  {id:'satisfactory',title:'Satisfactory',genres:['Automation','Factory building'],description:'Connect the next conveyor, untangle the production line, and make room for another big idea.',theme:'conveyor'},
];
/** Curated presentation order, never a popularity ranking. */
export const previewGameIds: readonly GameId[] = ['minecraft','repo','phasmophobia'];
export const previewGames = () => previewGameIds.map(id => communityGames.find(game => game.id === id)!).filter(Boolean);
