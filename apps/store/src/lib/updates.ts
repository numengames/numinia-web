/**
 * Updates view-model (MISSION-003 P3) — the platform's version timeline.
 * Legacy history (v0.1.0–v0.15.0) is parsed from the extracted portable
 * record; rebuild versions are appended here as first-class data.
 */

// Committed record: imported, not read from disk (runtime-portable).
import legacyChangelog from '../content/legacy-changelog.md?raw';

type UpdateEntryType = 'NEW' | 'FIX' | 'UPD';

interface UpdateEntry {
  readonly type: UpdateEntryType;
  readonly text: string;
}

export interface UpdateVersion {
  readonly version: string;
  /** Sealing commit timestamp, true UTC (git is the source — no invented hours). */
  readonly date: string;
  /** Mission/ADR ids sealed by this version, shown as chips on the card. */
  readonly missions?: readonly string[];
  readonly entries: readonly UpdateEntry[];
}

/** Rebuild-era versions — newest first, prepended to the legacy timeline. */
export const REBUILD_UPDATES: readonly UpdateVersion[] = [
  {
    version: 'v0.116.0',
    date: '2026-10-16 23:30',
    entries: [
      {
        type: 'UPD',
        text: "Opening a community is free, and the screen says so. In «Nueva organización»: «Opening it is free. You pay only when you give it a world that is running.» On «Saldo», an account with nothing that costs — no world placed in it, none charged to it — shows no «Low balance» warning: the balance stays in sight and the line reads «This community spends nothing yet. You will pay only when it has a world running.»; the top-up is there, as a quiet, secondary act. An account with a world and less than 10 € keeps the warning and the top-up as today. The organization panel's summary follows the same rule. The till now says whether an account has anything that costs. In all five languages.",
      },
    ],
  },
  {
    version: 'v0.115.0',
    date: '2026-10-16 23:01',
    entries: [
      {
        type: 'NEW',
        text: '«Gatherings» (/calendar/) opens on a list: every upcoming gathering of the city, one section per month in date order, each row with its day, its name (which opens its page), who holds it, where, how (in person, online) and how long until it starts. «Month» swaps the list for the month grid and «List» brings it back; without JavaScript the list is all there is, and no switch that does nothing. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.114.0',
    date: '2026-10-16 22:35',
    entries: [
      {
        type: 'NEW',
        text: 'The city and you. numinia.com now has two bars, one on each side. On the left, the city — what is everyone’s: search, Now, Communities, Gatherings, Worlds and the Bazaar, and below them which worlds have people inside right now (only how many, never who) and the next gathering; at its foot how it works, the sister sites and the legal texts. On the right, you — what is yours: your face and your menu (profile, balance, panels, settings, sign out), «Create» (today: a home for your community; gatherings and worlds will follow), your notices, your communities, your balance and your loot, and at its foot the settings, the appearance (system, night or day) and the language. Each bar folds on its own and the device remembers it; on a narrower screen they fold by themselves, and folded they still name each icon when you point at it. On a phone, a bar at the bottom — Now, Communities, Gatherings, Worlds and «You» — and «You» opens a sheet with everything that is yours. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.113.0',
    date: '2026-10-16 21:06',
    entries: [
      {
        type: 'NEW',
        text: 'The front page is «Now», the same for everyone. At the top, one featured thing at a time in a wide frame — the nearest encounter with «Count me in», or a world with people inside with «Enter the world» once the world itself says someone is there — and arrows to see the next; nothing moves by itself. Then the upcoming encounters in your own time zone, the three communities that meet soonest, and the four newest goods of the Bazar. On a phone, «Inside right now» lists the worlds with people, only when there are. The questions the front page used to answer moved to «How it works». In all five languages.',
      },
      {
        type: 'NEW',
        text: '«Worlds» (/mundos/): every world of the city a community holds, with one world card used everywhere — its picture, whether it is on, off or under works (with what that means, on hover or focus), how many are inside when the world itself says so, and whose it is — with «Enter» and «Its page». Chips filter them: all, with people now, of the city, of communities; a chip with nothing behind it is not drawn. A world’s own page shows the same card. In all five languages.',
      },
      {
        type: 'NEW',
        text: 'The Bazar says whose shelf is whose: a line above the finder with one chip per community that has uploaded something — today Numen Games, whose goods are everyone’s — and never a chip with zero.',
      },
    ],
  },
  {
    version: 'v0.112.0',
    date: '2026-10-16 22:15',
    entries: [
      {
        type: 'NEW',
        text: 'Numen Games is no longer one more card on «Communities»: it sits at the top right, in a sphere with the oracle and a ring with one dot per community. Drag it or use the arrow keys to turn it; it turns once when it arrives and then stays still. With a mouse a dot says its name and goes on a click; on a touch screen the first tap says the name and brings it to the front, the second goes. At most twelve dots, the communities with the soonest encounter; the rest in a «+N» that leads to the list. On a phone the card lies down and the place chips are one row that slides.',
      },
      {
        type: 'NEW',
        text: 'The page of Numen Games tells what the house is: the community of communities. What it does and why, a line of the canon, the door to the Agora and «How it is played», the big sphere with every community, the three linked rings (the motive, the model, the story), the metagame — the ranks, the Gates, the seasons, the seals, the Codex — what it keeps, its gatherings, its people, its archive, and the epitaph under the Khepri. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.111.0',
    date: '2026-10-16 23:10',
    entries: [
      {
        type: 'NEW',
        text: 'The AIs of a community, in the panel and behind the scenes. A community keeps its own AIs, with their own key: the person who creates one answers for it, and it never goes beyond what that person may do. Each has a switch — on or off — and a state: awake and willing to act, or asleep, which looks and listens but does not build. numinia.com gives each AI a pass of ten minutes, renewed by itself, so a change reaches the world within ten minutes; if the person who answers for an AI leaves or can no longer manage roles, it gets no more passes. Creating, switching, putting to sleep, giving roles to and removing an AI are all written in the community’s log. In the panel, the new piece «Agents» (/panel/agentes/, in five languages) lists them: each row shows the name, its roles, an On/Off switch and its state — Active or Asleep — with a plain line on whether it can enter the worlds and who answers for it; whoever may manage roles invites an AI in three steps (name and permission, the one-line command that makes its key, the public key pasted), gives and takes its roles, and removes it after a confirmation. The community turns the piece on or off in Settings, and the panel says that changes reach the worlds in about ten minutes at most.',
      },
    ],
  },
  {
    version: 'v0.110.0',
    date: '2026-10-16 21:19',
    entries: [
      {
        type: 'NEW',
        text: 'The house is an administrator of every community. In the Worlds room, «Open all communities» opens the organization of each one in a single press and makes the house a member with the administrator role; it says how many are open and can be pressed again without harm. In all five languages.',
      },
      {
        type: 'NEW',
        text: 'The Census no longer offers the organizations a person already belongs to, says so when there is none left, and when the till refuses an add it now tells the reason in words, not only «could not add». New organizations start with the default role colours — Administration orange, Finance blue, Member green — and in Numen Games the administrators are the Oracles.',
      },
    ],
  },
  {
    version: 'v0.109.0',
    date: '2026-10-16 20:11',
    entries: [
      {
        type: 'NEW',
        text: 'A world’s page has a new section, «AI», for whoever manages the world. It lists the AIs that come in as one more person — what each may do (look and talk, or also build), whether it is connected or asleep — and lets you remove one after a confirmation. «Invite an AI» takes three short steps: a name and a permission, one line to run where your AI lives to make its key, and the public key it prints. numinia.com asks the world for its list with your own world pass and renews the pass by itself; if the world does not answer, or is not on the new engine yet, it says so in plain words. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.108.0',
    date: '2026-10-16 19:50',
    entries: [
      {
        type: 'NEW',
        text: 'The face menu of the header: your name if you published one, your rank, «Your balance» with the figure, one door for each panel of the organizations you belong to, Settings and Sign out. It reads the till only when you open it. There is no status and no «set a status line»: nobody sees who is online yet.',
      },
      {
        type: 'NEW',
        text: '«People», a new piece of the panel: the community’s people in groups — the Oracles, then one group for each role under the community’s own name, then everyone else — each with their avatar (the Bazaar’s if they chose one), name, role and rank in the city. It shows nobody as online, and it can be switched off in Settings like any piece. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.107.0',
    date: '2026-10-16 19:19',
    entries: [
      {
        type: 'NEW',
        text: 'Settings of the community, a new piece of the panel. Each community switches on only the pieces it uses, picks how the panel names things — simple, mixed or Numinia words, on screen only — and reads how the house comes in to help. What is off leaves the rail and the cards, and the address of a piece that is off says so plainly, with a button to turn it on for whoever manages the community. Every change is written in the community’s log. In all five languages.',
      },
      {
        type: 'NEW',
        text: '«What happened» in the panel’s summary is now the community’s log as a readable list: who, what and when in your own time zone, newest first, thirty at a time with «See more»; the house’s reads show as «The house» with its name. A world’s page and the panel’s Venues say who may enter and name the people who can, and the address of a world that does not exist now answers 404. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.105.0',
    date: '2026-10-16 14:48',
    entries: [
      {
        type: 'NEW',
        text: 'A community is an organization. In the Worlds room («Assign to an organization») and in the Census («Add to an organization») the house now chooses among the communities of the register — all of them, the house-only ones too — and then among the organizations the till already had. Nobody has to create anything by hand in Balance.',
      },
      {
        type: 'NEW',
        text: 'The first time the house uses a community — assigning a world, adding a person — the till opens its organization, and from then on it is the same one. The dialog says so in a line under the list. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.104.0',
    date: '2026-10-16 14:20',
    entries: [
      {
        type: 'NEW',
        text: '«Enter» on every world’s page, and on each world in the panel’s Venues. If you belong to the world’s organization, numinia.com sends you in with a short signed pass — your name, if you chose one, and your roles there — so the world knows who you are and what you may do. If you do not, or are not signed in, you go in as a guest. In all five languages.',
      },
      {
        type: 'NEW',
        text: 'For worlds’ engines: the pass is a signed token that lasts ten minutes and carries no wallet, and the key that checks it is published at /.well-known/world-pass-key.json.',
      },
    ],
  },
  {
    version: 'v0.103.0',
    date: '2026-10-16 11:58',
    entries: [
      {
        type: 'NEW',
        text: 'Every world now belongs to one organization. In the Worlds room the house sees which organization each world belongs to and assigns it — one world or several at once — from a list of organizations. Only the house can do it; the organization that holds a world is the one that runs it.',
      },
      {
        type: 'NEW',
        text: '«Venues» in the panel lists the worlds of the organization, each with a link, and every world has its own public page at /mundos/. The people of its organization also find there the way to its Venues, Members and Balance. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.102.0',
    date: '2026-10-16 10:46',
    entries: [
      {
        type: 'NEW',
        text: '«Who has signed in», on the Census page: the house now sees everyone who has ever signed in to numinia.com, with the first and the last time, searches them and adds any of them to an organization from there. Only the house sees this list. In all five languages.',
      },
      {
        type: 'NEW',
        text: 'In the panel’s Members, «Add member» suggests, as the house types, the people who have signed in, so nobody has to copy a wallet by hand. Noting a sign-in never slows it or stops it: if the note fails, you are in all the same.',
      },
    ],
  },
  {
    version: 'v0.101.0',
    date: '2026-10-16 10:30',
    entries: [
      {
        type: 'NEW',
        text: '«Your name in the city», a new section of Settings for whoever has signed in: a name you type and, if you like, one of the Bazaar’s avatars — never a photo of yours. Nothing leaves your browser until you press «Save»; from then on the people of your organizations see it, and nobody else. «Stop showing it» erases it for real, with no copy kept in any history. In all five languages.',
      },
      {
        type: 'NEW',
        text: 'Where people are listed — a community’s people, the panel’s Members, who holds each role — a fellow member now reads the name and the avatar each person chose, with the short wallet underneath; whoever chose none still shows as the short wallet. Anyone outside the organization still sees only how many they are.',
      },
    ],
  },
  {
    version: 'v0.100.0',
    date: '2026-10-16 09:29',
    entries: [
      {
        type: 'NEW',
        text: 'A world’s address is written by the fleet itself: no more records made by hand in Cloudflare for a world on a machine other than open-1. While you type the address, the wizard asks who answers for it — nobody yet, a record of the fleet, or one made by hand — and says what will happen: «the room will create it towards the machine», «it will move it», «it already points there», or, for a record made by hand that points elsewhere, choose another name. When you create the world, or bring it back from its zip, the room writes the record (A, DNS only) before your wallet signs; if it cannot, nothing is asked of the machine and it says why. Deleting a world deletes the record the fleet made for it; a record made by hand is never touched. The records are written by the till, which holds the only key, limited to the DNS of numinia.com and numen.games; this site holds none. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.99.0',
    date: '2026-10-16 06:02',
    entries: [
      {
        type: 'NEW',
        text: 'The Worlds room makes worlds on the Numinia Engine as well as on Hyperfy. The wizard’s engine step offers the engines the chosen machine says it runs — a machine that names none runs Hyperfy alone, as before — and the Numinia Engine comes with its newest published build, read from its release; until there is one the option says so and stays off. A world’s card names its engine and build, and an engine world’s card reads the engine’s own status: how many are inside and for how long, never who.',
      },
      {
        type: 'NEW',
        text: '«Update» on the card of a Numinia Engine world whose build is older than the newest one, where its machine takes updates: one signature names the world and the exact build it moves to, and the machine fetches that build first, saves the world and restarts it on it — whoever is inside is disconnected for a few seconds; its data and its adventure stay. The card says «Updating…» until the world runs on the new build. A build of another engine, or one the machine does not run, is refused in plain words.',
      },
      {
        type: 'UPD',
        text: 'Bring from a zip reads a Numinia Engine world’s zip too — its manifest, first or second version, and how many files it holds — after the rules every zip keeps, and offers only the machines that run that engine; the world comes back on the engine’s newest build, and if the engine on the machine cannot read the zip, the room says why in its own words. The fleet lists a second machine, bronte-xs-ca-003, and each machine’s line says which engines it runs. In all five languages.',
      },
    ],
  },
  {
    version: 'v0.98.0',
    date: '2026-10-16 05:36',
    entries: [
      {
        type: 'NEW',
        text: '«Balance and usage» is drawn as the prototype draws it, one screen for your own balance and for each organization’s. Three cards: the balance, with how many days it lasts at the pace of the last seven and the top-up inside it; this month’s spend and how many homes it charged; and the low-balance warning, with what happens at zero. Then the usage chart, each day split into homes running and stopped, with a table per home; every movement with the balance after it and a CSV you download straight from your browser; and the rules of the tariff in force, in sight, with who may top up. In all five languages.',
      },
      {
        type: 'NEW',
        text: '«Members» and «Roles» are now two pieces of the panel, ten in all. Members is a table of the people — their rank in the city, the roles they hold here (given and taken with a click), the month they joined and a menu to remove someone — with a search box and «Add member». Roles is an editor like Discord’s: the owners apart, the roles from the top down with how many hold each, moved up or down, and for each role its look, a switch per permission in five groups with what each allows in plain words, the acts only owners do, and who holds it. Whoever may not manage roles sees it read-only, with who can. Saldo’s members tab now leads there. In all five languages.',
      },
      {
        type: 'NEW',
        text: 'The panel’s Summary opens with four cards — the homes charged in the last 30 days, the next gathering, the people and the balance — and «The latest»: the five newest changes and top-ups of the organization.',
      },
    ],
  },
  {
    version: 'v0.97.0',
    date: '2026-10-15 18:10',
    entries: [
      {
        type: 'NEW',
        text: 'A new door in your account menu, «Panels», opens the panel of each organization you belong to: a switcher between them and the list of its pieces. «Members and roles» and «Balance and usage» work inside it just as they do in Saldo; the rooms only Oracles use — Census, Worlds, Prices and Assets — are linked from it; and what is not built yet — Homes, Gatherings, Agents, Memory, Bazaar items and Settings — is shown as under construction instead of left out. In all five languages.',
      },
      {
        type: 'NEW',
        text: 'The house can enter every organization that lets it in — all of them, during the alpha. An Oracle session lists them in the panel, in Members and in Balance next to its own, says «The house» as its place in each one it only enters, and the till writes every look and every change into the log of that organization, as the house. Anyone else sees only their own organizations, as before, and nothing a browser sends can say «I am the house»: numinia.com says it to the till, from the signed session.',
      },
    ],
  },
  {
    version: 'v0.96.0',
    date: '2026-10-15 15:45',
    entries: [
      {
        type: 'NEW',
        text: 'A community whose organization lives in Saldo now lists its people on its page, in all five languages. A member sees them in groups — first each role the organization shows apart, in the order of its roles, then everyone else — each person with a short wallet, a mark when they are an owner and a dot in the colour of their role. Anyone else, signed in or not, sees only how many members there are, and no name. Names and faces come later, with profiles.',
      },
    ],
  },
  {
    version: 'v0.95.0',
    date: '2026-10-15 13:05',
    entries: [
      {
        type: 'NEW',
        text: 'Giving «Administrator» or «Manage roles» in an organization works now: at that moment your wallet signs that very change — a few plain lines that name the organization, the role and the person, valid for two minutes. Google, email and passkey wallets sign without a window; MetaMask and WalletConnect show the lines and ask. Without the signature, with a late one or with another wallet, nothing changes and Saldo says why, in all five languages.',
      },
    ],
  },
  {
    version: 'v0.94.0',
    date: '2026-10-15 12:08',
    entries: [
      {
        type: 'NEW',
        text: 'A «Members and roles» tab in Saldo, in all five languages. For each organization you see its roles from the top down and who holds each one; you can create a role, rename it, colour it, choose what it allows, move it up or down, delete it, and give or take a role from a person — only where your own role lets you, and nothing that would fail is offered. A strip says when you enter as the house, and the log lists the last changes. Giving «Administrator» or «Manage roles» waits for a fresh signature from your wallet, which is not ready yet.',
      },
    ],
  },
  {
    version: 'v0.93.0',
    date: '2026-10-15 10:30',
    entries: [
      {
        type: 'UPD',
        text: 'Saldo shows each person only what their roles let them do in an organization. Where you may not rename it, invite someone or change a role, there is a sentence saying which permission it takes and which roles hold it, instead of a button that fails. Everyone can still top up and leave.',
      },
      {
        type: 'FIX',
        text: 'When Saldo refuses something it now says why in plain words, in all five languages — you may not act on someone at or above your own role, an organization keeps at least one owner, and so on — instead of «The till did not allow it».',
      },
    ],
  },
  {
    version: 'v0.92.0',
    date: '2026-10-15 07:05',
    entries: [
      {
        type: 'FIX',
        text: 'Choosing a good in the Bazaar no longer squeezes the cards into one per row on a laptop. At 1280 and 1366 px the filters and the preview slim down and the cards stay two to a row (three with nothing chosen); «See it in 3D» no longer covers the kind’s label in that narrower preview.',
      },
      {
        type: 'UPD',
        text: 'The preview of a PNG or JPG shows the whole picture at 960 px — about a tenth of the weight — instead of downloading the original, up to 2.2 MB. The Download button still gives you the file itself.',
      },
    ],
  },
  {
    version: 'v0.91.0',
    date: '2026-10-15 06:30',
    entries: [
      {
        type: 'UPD',
        text: 'Signing in is one clean panel over the site, as on TikTok or Airbnb: close, the mark, «Sign in to Numinia», the ways in from the first moment — Google, email, a passkey or your wallet — and one line at its foot: continuing is accepting the Terms and having read the Privacy Policy. No box to tick first; the version you accept still travels with your sign-in. On a phone it fills the screen. The Google button speaks your language.',
      },
      {
        type: 'NEW',
        text: 'Notifications: the bell in «More» opens them, in two tabs, Updates and Requests. Nothing sends notices yet, so each tab says so plainly, and signed out the page asks you to sign in.',
      },
      {
        type: 'UPD',
        text: 'The site’s updates have one door: the version number at the foot of the sidebar. They left «More» and the player area, and the old address in the player area leads here. Every version links to its change on GitHub.',
      },
    ],
  },
  {
    version: 'v0.90.0',
    date: '2026-10-15 02:00',
    entries: [
      {
        type: 'NEW',
        text: 'Saldo takes back what Stripe gives back. A refund — whole or in parts — or a bank dispute now comes off the account that was topped up, and a dispute won returns it. If that balance was already spent, the account goes below zero and the next top-up pays the debt first. Each event counts once, however often it is read.',
      },
      {
        type: 'NEW',
        text: 'The Prices room warns the Oracle if the till has not read Stripe for more than two days: Stripe keeps its events thirty days, and none should be lost.',
      },
      {
        type: 'UPD',
        text: 'Saldo says who sells the top-up and what your bank will show, before you pay and once it is done: Link (Stripe) sells it and sends the invoice, and the charge appears as LINK.COM* NUMEN GAMES.',
      },
    ],
  },
  {
    version: 'v0.89.0',
    date: '2026-10-14 21:45',
    entries: [
      {
        type: 'NEW',
        text: 'The player area is lighter and says where it stands. The site’s updates now live inside it, behind their own megaphone; the bell is kept for notices. It opens with your summary, your character, the seasons, the updates and the settings: the Codex, Portals, Loot and Stats are switched on one by one in Settings. Loot and Portals carry an «Under construction» mark in the menu and at the top of their page.',
      },
      {
        type: 'UPD',
        text: 'Seasons shows your way through the eight doors first, and the €9.99 season pass below it.',
      },
      {
        type: 'NEW',
        text: 'Stats opens with the city: its communities, the gatherings to come, the open homes, the objects in the Bazaar and how many people are inside right now, each figure with where it comes from. The archive’s figures follow.',
      },
      {
        type: 'NEW',
        text: 'Your profile is yours to fill: a photo, your name, a line about you, your city and your links, kept in this browser. The character sheet asks for one thing while it is empty, shows the characteristics in two columns with their dots, and opens the manual’s own blank sheet inside it.',
      },
      {
        type: 'UPD',
        text: 'Signing in reads in two columns: what it is on the left, the way in on the right. The steps carry one number each (they read «1 1, 2 2»), one line explains MetaMask’s list of permissions — Numinia uses only your address and one signature, never a transaction — and a fresh sign-in lands on your profile.',
      },
      {
        type: 'NEW',
        text: 'The Bazaar’s cards put the picture first and large, then the name, its kind and format, and the licence. A PNG or a JPG is its own picture, on its card and whole in the preview. Card pictures are lighter too: a screen of ordinary density downloads a cut of less than half the bytes.',
      },
      {
        type: 'FIX',
        text: 'The 3D viewer shows a GLB: the camera frames the model and measures its clipping planes from it, an emote shows its skeleton, and a model that cannot load says why and offers its file. Every state speaks the page’s language.',
      },
      {
        type: 'NEW',
        text: 'The Oracle’s assets room adds, edits and deletes goods. «Add» opens GitHub’s upload page in the chosen kind’s folder; each row’s «Edit» and «Delete» open its kind’s catalogue in GitHub’s editor, which makes the change. The site itself writes nothing.',
      },
      {
        type: 'UPD',
        text: 'On screen the city says «gathering» where it said «ritual», in the five languages; addresses and files keep the old word. The home’s objects sit in one row with arrows, like the gatherings, and every community page says what its space uses: its home and who is inside, its gatherings, and its archive, members and balance — under construction, except Numen Games’ archive and members, which are already real.',
      },
    ],
  },
  {
    version: 'v0.88.0',
    date: '2026-10-14 21:30',
    entries: [
      {
        type: 'NEW',
        text: 'Saldo: your account and your organizations’ in one screen. Pick the account at the top — yours, or any organization you belong to — and see its balance, which never expires and warns you below 10 €; what was spent in the period; usage per day for 7 or 30 days, or per month for a year; and every movement. Top up 10, 50 or 100 €: Stripe opens in a new tab, sells as merchant of record and sends the receipt; back here the balance updates on its own. Test mode for now: no real money moves yet.',
      },
      {
        type: 'NEW',
        text: 'Organizations of your own. Create one from Saldo and you are its admin: rename it, add members by wallet, make them admins or members, or remove them. An organization never loses its last admin. Every member sees its balance and can top it up.',
      },
      {
        type: 'NEW',
        text: 'Saldo has its place in the sidebar once you are signed in, and a Referrals page that says plainly it is coming soon.',
      },
    ],
  },
  {
    version: 'v0.87.0',
    date: '2026-10-14 17:30',
    entries: [
      {
        type: 'NEW',
        text: 'The Numinia RPG manual reads aloud with numinia.org’s player. «Listen» in the top bar says how long the chapter takes and reads it with your device’s own voice — nothing leaves your device. While it speaks, a bar at the foot of the page shows the section and the time, a ruler with a mark per section to jump to any sentence, the speed (1×, 1.25×, 1.5×, 2×, 0.75×) and stop. What has been read fades like drying ink and a soft light follows the word; tap a sentence to hear it from there. Scroll away and «Back to the reading» brings you back. Pause, leave the chapter and return: it resumes where you were.',
      },
      {
        type: 'UPD',
        text: 'The old Narrador gives way to it: the same voice, on the chapters, the character sheet and the glossary.',
      },
    ],
  },
  {
    version: 'v0.86.0',
    date: '2026-10-14 16:30',
    entries: [
      {
        type: 'NEW',
        text: 'The front door has two faces. A first visit, without a session, now says what Numinia is in one line — your organization, with a home of its own in a 3D city — and opens the Agora Plaza with one click, no account needed. Then the four steps, the communities whose home is already open, the six templates with a short form to ask for yours, what stays yours, the city in one paragraph and the questions people ask. Once you sign in, the front door is «For you», as before.',
      },
      {
        type: 'UPD',
        text: 'Asking for a home is a short form instead of a bare address: name, kind of home, a rough date and your email. Pressing send opens your mail with everything written.',
      },
      {
        type: 'UPD',
        text: 'The third step says «Come to its gatherings»: plain words first; «ritual» stays the city’s word inside.',
      },
    ],
  },
  {
    version: 'v0.85.0',
    date: '2026-10-14 15:20',
    entries: [
      {
        type: 'NEW',
        text: 'A community can have its own 3D home. Its page names the home and opens it with «Enter», and its rituals open there too. València Innovation Capital is the first: its world at vic.numinia.com is now its home. A home on the house’s fleet also says how many people are inside right now — a number read from the world itself, never a name.',
      },
      {
        type: 'NEW',
        text: 'Live shows what it promised. «Now» lists the homes someone is in at this moment, and «Open homes» lists every community with a 3D home and its door. When nobody is inside anywhere, it says so.',
      },
      {
        type: 'NEW',
        text: 'The Oracle can edit a community’s page and its rituals from the site, and add a new ritual already filled in. The file opens in GitHub’s editor; saving leaves a proposed change that someone else approves before it is published. Only an Oracle sees these buttons.',
      },
    ],
  },
  {
    version: 'v0.84.0',
    date: '2026-10-14 14:30',
    entries: [
      {
        type: 'FIX',
        text: 'You sign in and you look signed in. The top bar used to offer «Sign in» on every page even after you had entered; now it shows your account — your face, the short form of your wallet — and opens on your rank, Profile, Settings and «Sign out». The sidebar’s invitation to sign in goes away once you are in, and Belong says so too. One read of the session per page feeds the whole chrome, and it changes the moment you sign in or out, without reloading.',
      },
      {
        type: 'FIX',
        text: 'Your real rank, everywhere. The citizen card in Profile used to say «Nomad» and the settings showed the rank’s internal id; both now name your rank in your language, the settings mark every rank up to yours as granted, and without a session they say you have none — a Nomad is someone who has signed in. The count of permissions reads the real total.',
      },
      {
        type: 'UPD',
        text: 'The sign-in page speaks your language — the step-by-step guide, the panel and the wallet widget itself — and once you are in it shows who you are instead of the sign-in buttons. Every door to it now brings you back to the page you came from after signing in; a way back to another site is ignored.',
      },
      {
        type: 'FIX',
        text: 'One way out. «Sign out» in the bar, in Settings and on the sign-in page all do the same thing: the wallet is disconnected first, then the session, and you land on the home page. The sign-out in Settings used to leave the wallet connected.',
      },
      {
        type: 'FIX',
        text: 'Signing in no longer depends on landing on the same server twice. The one-time code a wallet signs was kept in one server’s memory, and a sign-in whose second step reached another server was refused; the code now carries its own expiry under the site’s signature, so any server can check it.',
      },
    ],
  },
  {
    version: 'v0.83.0',
    date: '2026-10-14 11:20',
    entries: [
      {
        type: 'NEW',
        text: 'The site is an app now. A sidebar on the left, which folds to the scarab alone and remembers it, holds the Numinia mark, the search and the places: For you, Explore (with Communities, the Calendar and the Bazaar beneath it), Belong, Live, Profile and More (How it works, open your community’s home, buy us a coffee, Updates, Help), then the door to sign in and, folded at the bottom, the three sister sites (Numen Games, Numinia, the Archive), the terms and policies, the version and the skull. The top bar holds only the door and ⋮ (appearance, language, settings), and the whole width is the page. On a phone, five tabs at the bottom.',
      },
      {
        type: 'UPD',
        text: 'The front door is action, not explanation: a wide featured card that steps through the next rituals, the upcoming rituals, objects from the Bazaar for your home — each with its licence, its data and its tags — and the communities with life. How the city works moved to its own page.',
      },
      {
        type: 'NEW',
        text: 'The Bazaar, the one door to the digital goods: collections and formats on the left, the objects in a grid, the preview and the download queue on the right, one .zip for all of it, the licence always in sight. The Gallery, the Archive’s index, the Finder, the Inspector and the Assets page went out with it; their addresses lead to the Bazaar, and the old docs lead to numinia.org.',
      },
      {
        type: 'NEW',
        text: 'How it works, in four steps, the six kinds of home a community can open and why a city; it replaces the city page, whose address leads there. Live: the homes with people inside (none tells it yet, and the page says so) and the next rituals. Belong: the communities you follow and, once membership exists, the ones you belong to. Follow a community from its page: it stays in your browser.',
      },
      {
        type: 'UPD',
        text: 'A ritual’s page opens on its world: the community’s home, wide, with «Enter the world» when it has one and «still to open» when it does not, and then its date, the calendar file, sharing, the programme and the details.',
      },
    ],
  },
  {
    version: 'v0.82.0',
    date: '2026-10-14 05:30',
    entries: [
      {
        type: 'NEW',
        text: 'The front door is a city where communities have a home. A conference, a classroom, a team, a community: each has in Numinia a 3D home, a calendar of its rituals and an archive of its own. The home opens on what we do, with a featured community beside it, the upcoming rituals in a strip, the three communities with the nearest ritual, how it works in four steps, the three kinds (Lodge, League, Brotherhood) with their seals, six templates and the four agents.',
      },
      {
        type: 'NEW',
        text: 'Communities: eleven pages opened by the house for the communities it has worked with — Numen Games, which founded the city, La Tarugo, MERGE, the Active Inference Institute, Commit Conf, València Innovation Capital, Tetuan Valley, Arcasiles, R3S3T, the City of Mesa and the Fundación Verón — each with what it is, where it is from, its line, its links, its rituals (standing, upcoming, held), its archive, its home, its members and the invitation to make the page its own. Four more are prepared on file and wait for their community’s yes. An index with a search box and filters by place, in the five languages.',
      },
      {
        type: 'NEW',
        text: 'Rituals: a page for each — TRG26, MERGE Madrid, the Anniversary of Numinia, the Active Inference Symposium, Public Domain Day, MERGE Buenos Aires, and the ones already held — with when (the same day everywhere), where, who can go, the programme as read on the community’s site, and a file to add it to your calendar. The calendar, month by month, and iCalendar feeds for the city and for each community. Every community and every ritual is a file under src/content/communities/: the page shows what the file says.',
      },
      {
        type: 'UPD',
        text: 'The bar carries no menu: the scarab opens it, then the search, the mode, the language and the door. The footer links every section, the communities and the calendar.',
      },
    ],
  },
  {
    version: 'v0.81.0',
    date: '2026-10-13 13:17',
    missions: ['MIS-184'],
    entries: [
      {
        type: 'NEW',
        text: 'Prices, a new room in the Oracles’ zone of LAP. It opens on the tariff the till charges today: its version, since when, who published it and why, and each size’s price a day running and stopped, without VAT and with it, and a month running; a version scheduled for later is named under it. Then the calculator, with the machine, how full the machines run, how much processor each world is promised, the nightly copies, the average top-up, who sells, the team’s hour and the support minutes. Each size has its own card: who it is for — Small up to 20 people at once, Medium up to 50, Large up to 100 — its two prices, which are the draft you will publish, what it costs the person who pays, how long a 10 € top-up lasts, what it costs us piece by piece and its gross margin, marked when it reaches 60 %.',
      },
      {
        type: 'NEW',
        text: 'Under the cards, the profit of an example fleet in a month — the worlds of each size and how much of the month they run, the machines they need, copies, support, Stripe, the fixed costs and voice, video and AI — and where our sizes stand against the market, in a table with bars. The tariff’s seven rules are folded beneath, in euros and days, each with what it means.',
      },
      {
        type: 'NEW',
        text: 'Publish schedules the draft as a new dated version in the till. The room asks the till about the draft each time it changes: a rise needs its notice, and the room says from which day it may start and moves the date there in one click; a draft that changes nothing cannot be published. The dialog shows what changes, size by size, before and after, with and without VAT, the rules that change, the day it starts and the why you wrote; a rise also says that nobody is told by email yet. Once published, the version waits in the history until its day; what was charged before never changes. The history lists every version, newest first, and any of them can be taken back to the calculator, prices, rules and assumptions included.',
      },
      {
        type: 'NEW',
        text: 'The till opens its first door, an Oracle desk to read the tariff, check a draft and schedule a version with who published it and why. Only numinia.com reaches it, through a binding between the two Workers that has no address on the internet; the site checks the Oracle’s session first and the till checks every figure again.',
      },
    ],
  },
  {
    version: 'v0.80.0',
    date: '2026-10-13 01:40',
    missions: ['MIS-164'],
    entries: [
      {
        type: 'NEW',
        text: 'A world comes back from its zip. In the Worlds room, Bring from a zip — beside + New world — opens your files, and a zip dropped anywhere on the room does the same. Before anything is signed, the room reads the zip in your browser: what it is (a fleet copy of which world and from when, or a world’s folder and how many files it holds) and anything its machine would refuse, in plain words. Then one dialog, Place and Sign: the world’s name (its own, or the next one free), the machine, the address; the engine is the fleet’s. One signature covers the world, its address, the machine, the engine and the zip’s exact size and fingerprint, so the machine takes that zip and no other.',
      },
      {
        type: 'NEW',
        text: 'The zip travels from your browser straight to its machine, never through numinia.com. The dialog closes as soon as the machine takes the request; the new world’s card comes first, whatever the filters say, and carries the upload — how much has arrived, with a bar, and Stop the upload — then Checking… while the machine opens it. It always lands stopped, with Start first, and its own admin code is shown once on its card; if the card is out of sight, a notice says the world has arrived.',
      },
      {
        type: 'UPD',
        text: 'A dropped connection says how far the upload got: Upload again sends the same zip to the same place without a new signature, and Discard lets it go. After a reload the room asks for the same zip again and checks it is the same one. Every refusal has its own words — a zip too big for its machine, no room left, a password, paths that leave the folder, links, a zip bomb, no world inside, a database copied while the world was running, a damaged one — and names the file inside the zip that broke the rule; a world its machine refused shows no admin code. What the machines did names the new request: brought back a world.',
      },
    ],
  },
  {
    version: 'v0.79.0',
    date: '2026-10-12 19:32',
    missions: ['MIS-170', 'MIS-173'],
    entries: [
      {
        type: 'NEW',
        text: 'Each world has its own admin code. Its card in the Worlds room shows it — Show, one signature — and changes it — Change code, one signature: the machine makes a new code and restarts that world, so whoever is inside is disconnected for a few seconds and from then on only the new code works. A stopped world takes its new code when it starts. Until now every world on a machine shared one code, so a client’s code would have opened the house’s worlds too; a leaked code now stops working within a minute, for that world alone. Whoever already became an admin with the old code stays one, because the world remembers its admins. Worlds made before keep the shared code they had until someone changes it.',
      },
      {
        type: 'UPD',
        text: 'A machine’s line no longer shows a code for all its worlds. It says which recipe the machine was installed from — “recipe” and the first seven characters of its commit — and, when that is not the recipe the room hands out, warns that the machine runs an older recipe and shows its line to run again.',
      },
      {
        type: 'UPD',
        text: 'The line that makes a server a machine of the fleet installs one exact, reviewed commit of the machine’s recipe instead of whatever its main branch holds at that moment, so a change merged there later reaches no machine until the room hands out a new line.',
      },
      {
        type: 'UPD',
        text: 'A world just created shows its own admin code on the wizard’s last screen. What the machines did names the new requests: showed the code of a world, changed the code of a world.',
      },
    ],
  },
  {
    version: 'v0.78.0',
    date: '2026-10-12 13:55',
    missions: ['MIS-156'],
    entries: [
      {
        type: 'FIX',
        text: 'Signing twice in one visit works. After the first signature, every later one in the Worlds room said your wallet could not be found, though your session was still open: the wallet library answers its first connection only once per page. The room now keeps the wallet it found; if it truly cannot find it, it says your session is still open and links to Session in another tab.',
      },
      {
        type: 'UPD',
        text: 'A dialog closes as soon as the machine takes the request. Stopping, starting or deleting a world is one signature, and then the world’s card says what is happening — Creating…, Stopping…, Starting… or Deleting…, with the waiting moon and no buttons until it is done. A deleted world leaves the list at once, and its machine’s line says its address is being freed. Only a download still waits in the dialog, for its zip.',
      },
      {
        type: 'UPD',
        text: 'Deleting a world is confirmed by typing its whole address as it is written, in normal case. Every dialog shows the world’s address and machine under its title. While your wallet or the machine is being asked, a click outside or Esc no longer closes it by mistake; before that, a click outside closes it.',
      },
      {
        type: 'NEW',
        text: 'Each machine says whether it obeys. Its line under Machines reads its heartbeat: late after three minutes without finishing its work, not obeying after ten, or failing when its last attempt could not apply the changes — with how long ago it last worked and how many requests wait. Signing for a machine that is not obeying first warns that the request will wait in its queue.',
      },
      {
        type: 'FIX',
        text: 'A name or an address freed by a delete is not offered again until its machine has removed the old world: the wizard says it is being freed instead of calling it taken. A world whose page carries only the default title is named by its own name. What the machines did is shown in your own time, with how long each request took and, when one failed, the machine’s reason.',
      },
      {
        type: 'NEW',
        text: 'The room tells each machine how a request went on the browser’s side — asked, signed, refused by the wallet, accepted, unreachable — and how long each step took: names and numbers, never a wallet or a world. Machines that do not listen yet simply ignore it.',
      },
    ],
  },
  {
    version: 'v0.77.0',
    date: '2026-10-12 08:36',
    missions: ['MIS-156'],
    entries: [
      {
        type: 'NEW',
        text: 'A world is created from the Worlds room alone. Choose its name, its address and its engine, press Create and sign once with your wallet: the fleet machine checks the signature itself and the world answers at its address in about a minute. No pull request, no one logging in to the machine. The room then shows the machine’s admin code, to build in the world, and only to the Oracle who signed.',
      },
      {
        type: 'NEW',
        text: 'Any world of the fleet can be downloaded as a zip, as the Alchemists’ Tower did: a consistent copy of its database and files, a compose file to run it at localhost:3000 and fresh keys of its own. The machine keeps the copy for a day; the dialog shows its size and its SHA-256 fingerprint, and the button to save it.',
      },
      {
        type: 'NEW',
        text: 'Deleting a world asks before it acts. It says what will be lost and that it cannot be undone, offers to download a copy first, and goes ahead only once you type the world’s name. Stopping and starting a world are one signature each.',
      },
      {
        type: 'UPD',
        text: 'The room reads each machine directly: its worlds and what is happening to them (being created, stopped, started or deleted), and what it did, when and signed by whom. A machine whose door does not answer is shown with the one line that connects it, already carrying your wallet. Only the wallet you signed in with can sign, and the room keeps no key.',
      },
    ],
  },
  {
    version: 'v0.76.1',
    date: '2026-10-11 19:57',
    entries: [
      {
        type: 'FIX',
        text: 'Signing in shows at once what your rank opens. The LAP’s management zone — and, for an Oracle, the Worlds room — appeared in the side menu only after reloading the page you had signed in on. The sign-in now tells the menu, which shows those rooms straight away and hides them again when you sign out.',
      },
      {
        type: 'FIX',
        text: 'One press on “Connect a Wallet” opens the list of wallets. The step guide appeared on the press itself and pushed the sign-in box down, so the release landed beside the button and it took a second press.',
      },
    ],
  },
  {
    version: 'v0.76.0',
    date: '2026-10-11 15:00',
    missions: ['MIS-156'],
    entries: [
      {
        type: 'UPD',
        text: 'The new-world wizard asks for the world’s name once. The name, the order file and the card in the Summa were three answers to the same question, so they are now one field; choosing a card still fills it in.',
      },
      {
        type: 'FIX',
        text: 'The wizard keeps what you typed. Closing it no longer empties the form: the draft waits until the world has been proposed, and an explicit “Start again” clears it. The screen that hands the change over to GitHub has a Back, so you can correct the world and hand it over again, and the browser’s Back button now closes the wizard instead of leaving the room.',
      },
      {
        type: 'FIX',
        text: 'The engine step no longer scrolls sideways. Its three boxes — memory, processors and upload limit — shrink with the dialog instead of pushing it wider than the screen.',
      },
    ],
  },
  {
    version: 'v0.75.1',
    date: '2026-10-11 14:30',
    missions: ['MIS-156'],
    entries: [
      {
        type: 'FIX',
        text: 'The Worlds room opens every time. It read the order book through GitHub’s API, which allows an address only 60 keyless reads an hour; a morning of QA spent them and the room showed only “GitHub answered 403”. Now the book has an index (open-worlds/index.json in numinia-assets) and the room reads it and each order as plain files, which have no such quota; the API is asked only for what the room can show without — the open proposals and the fleet history — and when GitHub refuses those, the room shows the worlds and says in plain words which part is missing and when the window reopens.',
      },
      {
        type: 'UPD',
        text: 'A proposal that orders or closes a world also updates the book’s index: with the room’s key, as a second commit on the same pull request; without it, the room shows the index as it must read, to paste into the pull request GitHub opens.',
      },
    ],
  },
  {
    version: 'v0.75.0',
    date: '2026-10-11 09:37',
    missions: ['MIS-156'],
    entries: [
      {
        type: 'NEW',
        text: 'The new-world wizard asks where the world lives in two choices: the fleet machine it runs on (open-1 today), and its address as a name plus a zone, numinia.com or numen.games. While you type, the room asks public DNS where that address points and says it in one line: already at the chosen machine, at another machine (choose another name), not in DNS yet (create its record first), or a legacy world being moved into the fleet. An address another world already uses cannot be ordered.',
      },
      {
        type: 'FIX',
        text: 'The wizard no longer proposes the old machine of the legacy worlds as the place for a new one. That machine reads no orders, so a world sent there would never have started; the wizard now offers only the fleet’s machines.',
      },
    ],
  },
  {
    version: 'v0.74.0',
    date: '2026-10-09 19:20',
    missions: ['MIS-156'],
    entries: [
      {
        type: 'NEW',
        text: 'The five worlds the old machine runs by hand (demo, portfolio, test, The Cultural Cyber Hive and vic, at numinia.com) appear in the room marked Legacy: live state, address and an Open button, but no stop, start or close, because nothing on that machine reads the order book. A world without a card is named and pictured by its own page: its title, and the picture it shows while it loads.',
      },
      {
        type: 'FIX',
        text: "The Worlds room reads the fleet's order book from the Oracle's own browser, with no key to configure. The order book is public, but GitHub refuses anonymous readers on Cloudflare's shared servers, so the room only showed an error. The server now only asks each running world how it is, at the address its approved order names.",
      },
    ],
  },
  {
    version: 'v0.73.0',
    date: '2026-10-09 19:10',
    missions: ['ADR-069', 'MIS-156'],
    entries: [
      {
        type: 'NEW',
        text: "The Worlds room becomes the fleet's console, modelled on the Alchemists' Tower. On top, four figures: total, running, stopped and with problems. Below, a search, filters by state and server, and three views: cards, list and by server. Each card shows the world's cover, which is the same picture the world shows while it loads. It also shows its state and why: how many people are inside and for how long, or why it does not answer.",
      },
      {
        type: 'NEW',
        text: "An Oracle can ask for a new world with a four-step wizard (card, place, engine, confirm) that shows the address and the exact order before sending it. They can also stop, start or close a world; closing asks you to type its name. Every change is a pull request on the fleet's order book in numinia-assets, and nothing is written anywhere else. Without the room's key, the same change opens on GitHub under the Oracle's own account. Below the views, the fleet's history.",
      },
    ],
  },
  {
    version: 'v0.72.0',
    date: '2026-10-09 18:30',
    missions: ['ADR-069', 'MIS-156'],
    entries: [
      {
        type: 'NEW',
        text: 'The LAP gains a Worlds room for the public worlds fleet. Only Oracles see it in the management zone, and only an Oracle session gets an answer from it; anyone else gets the refusal. It opens empty: the fleet has no worlds yet.',
      },
    ],
  },
  {
    version: 'v0.71.0',
    date: '2026-10-04 08:31',
    entries: [
      {
        type: 'UPD',
        text: 'The day and night switch at the top of every page shows the mode you are in: the moon with stars at night, the sun by day. It showed the other way round until now.',
      },
    ],
  },
  {
    version: 'v0.70.0',
    date: '2026-10-03 13:45',
    entries: [
      {
        type: 'NEW',
        text: 'A small skull now ends the last line of every page, after the build line. Point at it, focus it or tap it and it shows the epitaph that closes the manifesto: "They dreamed and experimented life, they imagined and took action. They were part of the fight to change the model, they did not let us alone, they built a game with which to create a better world." Escape closes it. The same skull is at the foot of numinia.org, numen.games and nwos.numen.games.',
      },
      {
        type: 'UPD',
        text: 'The coffee button in the footer now reads Back Numinia, and the page it opens has moved from /support to /back, in all five languages; the thanks page after paying is now /back/thanks/backer. The old thanks address still works and forwards you there.',
      },
      {
        type: 'NEW',
        text: '/support is now the Help page: how to get help, one channel per heading, each saying whether it is open. Discord, the community, open today; email at hola@numengames.com, where a person answers; legal@numengames.com for your personal data; and an agent that answers at any hour, coming soon. Its last line points to /back for anyone who came to back Numinia.',
      },
      {
        type: 'NEW',
        text: 'The Social column of the footer now lists Discord, after GitHub: the Numinia server.',
      },
    ],
  },
  {
    version: 'v0.69.0',
    date: '2026-10-02 18:00',
    entries: [
      {
        type: 'UPD',
        text: 'The old separate lore repository is gone for good: the Codex has read the manual from the archive since v0.50.0, and nothing pointed at it any more. The notes in the code that still named it now name the archive.',
      },
    ],
  },
  {
    version: 'v0.68.1',
    date: '2026-10-02 10:45',
    entries: [
      {
        type: 'FIX',
        text: 'The cookie notice no longer comes back on every page. If you had accepted the old banner before 29 September, your browser kept its old cookie next to the new one, the site read the old one first and asked you again and again. The old cookie is now cleared on your next visit, and your answer sticks.',
      },
      {
        type: 'FIX',
        text: "The 3D viewer's file relay now only passes models, pictures, sound and video, and only from the places the game keeps its files: our storage, and on GitHub only the game's own repositories. Anything else, a web page or a drawing that could carry a script, is refused instead of being shown as if it came from numinia.com, and what does pass is sealed so a browser can never run it.",
      },
      {
        type: 'FIX',
        text: "An old test door for wallet sign-in, left open since the first experiments, is closed. Using it could sign a citizen out of the player area by replacing the session with something the site does not accept. Signing in works as before, through the LAP. The cookie policy is 2.1.1: it no longer lists that door's cookie; nothing else changes, and nobody is asked again.",
      },
    ],
  },
  {
    version: 'v0.68.0',
    date: '2026-09-30 15:50',
    entries: [
      {
        type: 'NEW',
        text: "The season pass can be tried. Tick the box that you want it now, press Buy the pass and Stripe's own page opens in test mode: nothing is charged, and the note under the button gives the test card. It is the same test link the coffee uses, so Stripe's page still shows the coffee; the pass's own product comes when it goes on sale for real. The rewards on the track are still figurative: named and drawn, not yet tokens.",
      },
    ],
  },
  {
    version: 'v0.67.0',
    date: '2026-09-30 14:30',
    entries: [
      {
        type: 'UPD',
        text: 'The season now reads like a game pass. The eight doors stand in a row joined by a path; above each one, two boxes: the gold reward of the pass and the free reward. A door you have crossed lights up, the next one glows, and the ones after it wait in the fog with their names hidden. The eighth door, The Veil, carries a padlock: only pass holders enter, and its address is given to them alone.',
      },
      {
        type: 'NEW',
        text: 'Your progress is what you hold. Sign in with your wallet and every free reward in it counts as a door crossed, and the pass token as the pass. Nothing to type, nobody marks it by hand. Until the rewards are minted every door shows, and the fog appears by itself as they are.',
      },
      {
        type: 'NEW',
        text: 'Buying stays on the same page, one button with the price in euros, no cart. When the pass goes on sale, a separate box asks you to confirm you want it now and lose the 14 days to withdraw, as European law requires for digital content.',
      },
    ],
  },
  {
    version: 'v0.66.0',
    date: '2026-09-30 13:00',
    entries: [
      {
        type: 'NEW',
        text: "After buying a coffee, you come back to Numinia instead of Stripe's page: a thank-you page with a steaming cup and a burst of stars (still if your device asks for reduced motion). It names what you bought, says your supporter's badge is on its way and how it reaches you, where your receipt is and how to get help. It proves nothing and keeps nothing about you, and search engines do not index it.",
      },
      {
        type: 'UPD',
        text: 'Supporting Numinia is now easy to find: the footer of every page carries a button with a coffee cup, Support Numinia, under the line that says what the site is. The small hidden cup after the signature is gone. The same button is in the footer of numinia.org, numen.games and nwos.numen.games.',
      },
    ],
  },
  {
    version: 'v0.65.0',
    date: '2026-09-30 12:30',
    entries: [
      {
        type: 'NEW',
        text: 'Seasons are open in the LAP. Season I, The Awakening of the Veil, shows its eight doors: each with its puzzle, how long it takes, how hard it is, the free reward and the premium one, and a button that takes you into its world. Every door is open to everyone.',
      },
      {
        type: 'NEW',
        text: 'The season pass comes over from numinia.store: the premium reward of all eight doors and a pass token in your wallet, for €9.99 with VAT, paid once. The price and what it delivers are read from its record in the archive. The button says Coming soon until the pass goes on sale.',
      },
    ],
  },
  {
    version: 'v0.64.0',
    date: '2026-09-30 12:00',
    entries: [
      {
        type: 'NEW',
        text: "Support Numinia, at /support. At the very end of every page, after the signature, a small coffee cup leads to it. The page says why we ask, offers the Backer's coffee for 5 EUR paid once on Stripe's own page, and shows the three Sponsor levels (Bronze from 200, Silver from 2,000, Gold from 10,000 EUR) as coming soon. Today the coffee is a test payment: nothing is charged. Whoever pays will get a supporter's badge; delivering it is the next step.",
      },
    ],
  },
  {
    version: 'v0.63.0',
    date: '2026-09-29 21:10',
    entries: [
      {
        type: 'UPD',
        text: 'numinia.com now looks like the rest of its family, drawn after numinia.org. The top bar stays with you as you scroll: thinner (56 px), the page showing faintly through it, a fine line under it. Each entry has a small icon before its name, and the page you are on is underlined in turquoise. On a phone one menu button opens the entries full-screen. Pages read in a wider column, headlines are lighter, the small labels above sections are sea-green, and the main button of a page is the house turquoise with white letters.',
      },
      {
        type: 'NEW',
        text: 'At night a slow sky of stars sits behind every page, the same one numinia.org has: common stars in sand, rarer ones in green, blue, violet and, very rarely, amber. It stays still if your device asks for reduced motion, and it is not there by day. The top of the home page rises in gently as it opens.',
      },
      {
        type: 'FIX',
        text: 'The footer uses the same wide column and quiet headings as the other sites, and the Codex lost a few corner and line values that were not in the design system.',
      },
    ],
  },
  {
    version: 'v0.62.0',
    date: '2026-09-29 16:50',
    entries: [
      {
        type: 'FIX',
        text: "The Summa is written with two m's in every language: the Spanish label of an object's card now reads «Ficha en el Summa».",
      },
    ],
  },
  {
    version: 'v0.61.0',
    date: '2026-09-29 16:30',
    entries: [
      {
        type: 'FIX',
        text: 'The cookie notice shows Accept all and Reject all side by side and the same size on every screen, as on the other three sites of Numen Games. They were stacked one above the other.',
      },
      {
        type: 'UPD',
        text: "Pending, at the top of this page: the cookie notice in Japanese and Korean still shows English, and the Brazilian Portuguese one awaits a native reader. A legal text is not machine-translated. The legal notice is version 0.2.0: it gives the company's entry in the Mercantile Registry of Madrid (volume 46518, folio 130, sheet M-816810, entry 1) and the postal code of its registered address, 28290 Las Rozas de Madrid. The cookie policy is 2.1.0: it adds a key numinia.org keeps; nothing changes on this site.",
      },
    ],
  },
  {
    version: 'v0.60.0',
    date: '2026-09-29 13:30',
    entries: [
      {
        type: 'NEW',
        text: "A real cookie notice. On your first visit a small box says what the site keeps in your browser and offers Accept all and Reject all, side by side and the same size, plus Preferences. The one optional thing is Measurement — counting what is clicked, kept in the tab and never sent anywhere — and it stays off unless you accept it. Rejecting leaves the site working exactly the same. The Terms are no longer accepted from this box: you accept them when you sign in. Change your mind any time with 'Change my cookie choice' in the footer, or at the foot of every Codex page.",
      },
      {
        type: 'UPD',
        text: 'The four legal texts are the new versions from the archive, published in full: Legal notice (new), Privacy 2.1.0, Cookies 2.0.0 (new, listing every key the site stores) and Terms 1.0.1. The footer lists all four, and the Codex reader now links them at the foot of its pages. Because the Terms and Privacy changed, you will be asked to accept them again the next time you sign in. /legal/notice/ also leads to the legal notice.',
      },
    ],
  },
  {
    version: 'v0.59.0',
    date: '2026-09-29 14:00',
    entries: [
      {
        type: 'FIX',
        text: 'The LAP is written LAP everywhere, without dots. In Spanish it stands for Lector Akáshico Personal and in English for Lore Akashic Processor: the acronym is kept in both languages although the words differ, because the sense is the same. The Codex edition line no longer says Akashic Reader.',
      },
    ],
  },
  {
    version: 'v0.58.0',
    date: '2026-09-24 21:00',
    entries: [
      {
        type: 'FIX',
        text: "The footer says which commit of the site you are looking at, as the other three sites do. It printed 'dev' on the live site: the page is prerendered inside a Worker that does not see the build's commit, so the commit is now handed to it at build time like the other public build values. /version.json already had it right.",
      },
    ],
  },
  {
    version: 'v0.57.0',
    date: '2026-09-24 18:00',
    entries: [
      {
        type: 'FIX',
        text: 'The English names of the world are the ones its authors chose. Guild houses and branches: Draftsmen (was Projectors), Automatons (Automata), Legal Rabbits (Legal Counsels), Stewards (Intendants), Handcrafters (Artisans), Trustees (Syndics), Seraphs (Seraphim). The Humanitas are the Humanites in English, and the first Position is the Gatekeeper. The LAP keeps its name, which in English stands for Lore Akashic Processor. The city page also spells Cyanites, Hermeticists and Neo-Atlantists as the manual does.',
      },
    ],
  },
  {
    version: 'v0.56.0',
    date: '2026-09-24 15:00',
    entries: [
      {
        type: 'NEW',
        text: 'The Codex speaks English around the manual too. Outside Spanish, everything that frames the Numinia RPG manual now reads in English: the cover, the contents, the chapter headings, the bookmark, the Narrator (who now reads in an English voice), the reading moon, the Threshold, the downloads and the colophon. The free downloads offer the English edition — the whole book as .md, a PDF and an EPUB — and the glossary, acknowledgments and character sheet switch to English as soon as their translations land in the archive; until then they read in Spanish. /es/lap/codex/ stays exactly as it was',
      },
    ],
  },
  {
    version: 'v0.55.0',
    date: '2026-09-24 14:15',
    entries: [
      {
        type: 'NEW',
        text: 'The Codex reads the manual in English; Spanish keeps the original. On numinia.com the Numinia RPG manual now opens in its English edition — introduction, the seven chapters, English chapter addresses — on every language but Spanish, where /es/lap/codex/ reads the original text exactly as before. The old capitulo-N links still land on the right chapter everywhere, and a Spanish chapter link opened in English lands on the same chapter in English. The Broken Mirror module follows in English as soon as its translation lands; until then it reads in Spanish',
      },
    ],
  },
  {
    version: 'v0.54.0',
    date: '2026-09-24 12:30',
    entries: [
      {
        type: 'UPD',
        text: 'The Codex is public domain. The Numinia RPG manual and its world are CC0 1.0 from today: the colophon on the site, the free PDF and the EPUB now say so instead of "all rights reserved", and the landing footer no longer claims rights over texts anyone may now copy, adapt and publish. Only the names Numinia, Numen Games and Khepri stay protected as trademarks. Numen Games holds the rights and its authors agree',
      },
    ],
  },
  {
    version: 'v0.53.0',
    date: '2026-09-20 12:30',
    entries: [
      {
        type: 'NEW',
        text: 'The first card of the Summa, beside its legacy record: the Avocado avatar now shows, under the record it always had, what the Numinia archive registers about it — its status (a draft: the registry is being defined from real cards), its description and history, each form with its own licence and rights holder, how many copies of its bytes are declared, a download from the depot (numengames/numinia-assets, pinned to the commit the archive checked) and a link to the card on numinia.org. In the archive index a small amber mark says which goods have a card. The 31 other goods do not change. The cards are read from the archive at build, like the lore',
      },
    ],
  },
  {
    version: 'v0.52.1',
    date: '2026-09-19 20:20',
    entries: [
      {
        type: 'FIX',
        text: 'The archive this site reads from is numengames/numinia-archive — the name the repository has had since 2026-09-17. The lore fetched at build, the pinned design source and the links in the README said numinia-nwos and worked only because GitHub redirects the old name',
      },
    ],
  },
  {
    version: 'v0.52.0',
    date: '2026-09-18 14:30',
    entries: [
      {
        type: 'NEW',
        text: 'A link to this site presents itself (DSN-014): the scarab as favicon — the site had none —, one line in the five languages that says what Numinia is (the same line in the footer, the page description and the share card), and a 1200×630 share card drawn at build from the house type and colours. The old og.png (the wordmark and three years) retires',
      },
    ],
  },
  {
    version: 'v0.51.0',
    date: '2026-09-18 11:30',
    entries: [
      {
        type: 'UPD',
        text: 'The repository keeps code only: its own constitution, decision log, backlog and session records are retired — the rules, the vocabulary and the decisions of the house live in numinia-nwos (numinia.org). Nothing changes on the site; the legacy version history this page shows moved with the site content',
      },
    ],
  },
  {
    version: 'v0.50.0',
    date: '2026-09-17 12:50',
    entries: [
      {
        type: 'UPD',
        text: 'The Codex reads the manual from the archive: numinia-nwos lore/game/manual-v0.6.0.md and lore/codex/ — the game came home, the separate lore repository retires. Same text, byte for byte; the edition matter (glossary, acknowledgments, sheet) follows the same path',
      },
      {
        type: 'FIX',
        text: 'Deploys no longer send a GitHub token to read the lore: the archive is public and a stale LORE_TOKEN had turned a public read into HTTP 401, blocking every deploy since 16 September',
      },
    ],
  },
  {
    version: 'v0.49.0',
    date: '2026-09-16 12:00',
    entries: [
      {
        type: 'UPD',
        text: 'The footer takes the house shape, the same on the four Numen Games sites: the name written and one line saying what Numinia is; Navigation in two columns; a Numen Games column naming numen.games, numinia.org and nwos.numen.games with this site marked; Legal reduced to the two published texts; Social with the GitHub organisation; the closing line — scarab, signature, licence · telemetry · version · commit',
      },
      {
        type: 'NEW',
        text: '/telemetry in the five locales: version and commit today, the measurements later — a footer link must have a destination',
      },
      {
        type: 'NEW',
        text: 'The version in the footer is enforced: a pull request that changes apps/store/src without adding an entry here and raising the number is refused by CI (scripts/check-version-bump.mjs)',
      },
      {
        type: 'FIX',
        text: 'The build line prints the deploy commit, linked to GitHub — the same SHA /version.json is stamped with; local builds print "dev"',
      },
    ],
  },
  {
    version: 'v0.48.0',
    date: '2026-09-11 12:05',
    missions: ['MIS-116'],
    entries: [
      {
        type: 'UPD',
        text: 'The privacy policy is English and current: the archive resolved its language on 27 August and declared English the master, and the platform was still serving the superseded Spanish text fifteen days later — the copy is re-derived from the master, word for word, and now reads v2.0.0',
      },
      {
        type: 'FIX',
        text: 'Everyone accepts again: the corpus a citizen signed is identified by both master versions, and privacy went up a major — every acceptance recorded against the old text stops counting, by design, rather than letting a signature outlive the document it signed',
      },
    ],
  },
  {
    version: 'v0.47.0',
    date: '2026-08-18 16:40',
    missions: ['MIS-078'],
    entries: [
      {
        type: 'FIX',
        text: 'Night was never measured, and neither was anything below the fold: the accessibility gate now walks each page whole, in both modes, and the eight contrast failures it was hiding — badges, tags, pills, dates, mottos, ordinals, the destructive button and the footer signature — are fixed',
      },
      {
        type: 'UPD',
        text: 'The design system is no longer copied into this repository: it is governed by the archive and pinned here by version and digest, so the platform can never quietly drift from the law it wears',
      },
      {
        type: 'UPD',
        text: 'One door and one paper: the duplicated login spike retires in favour of the L.A.P., and the printable sheet now prints on the house paper like the book and the corpus editions',
      },
    ],
  },
  {
    version: 'v0.46.0',
    date: '2026-08-18 13:15',
    missions: ['MIS-086'],
    entries: [
      {
        type: 'NEW',
        text: 'The real legal corpus reaches the platform: Terms and Privacy Policy now render the company documents verbatim, no longer placeholders — with an honest note about their scope and the language each one is written in',
      },
      {
        type: 'NEW',
        text: 'The door asks first: no session is opened without accepting the published corpus, and what you accepted travels inside your own session — the server refuses a login that names no acceptance',
      },
      {
        type: 'UPD',
        text: 'The cookie notice stops speaking latin: real copy in five languages naming exactly what the platform stores, and every acceptance of the old placeholder is asked again',
      },
    ],
  },
  {
    version: 'v0.45.0',
    date: '2026-08-18 00:27',
    missions: ['MIS-085'],
    entries: [
      {
        type: 'NEW',
        text: 'The Hoja de Personaje joins the Codex as a printable annex: read it, print it, take the .md — and one door leads to the living sheet. It travels inside the PDF and EPUB editions too',
      },
      {
        type: 'NEW',
        text: 'El Narrador learns two more rooms — the glossary reads entry by entry and the sheet annex reads like any chapter — and the EPUB terms now link home to the glossary as well',
      },
      {
        type: 'UPD',
        text: 'Order under the hood: every file in the repository now declares its license (REUSE 3.3, guarded by CI) and the responsive sweep walks every real chapter instead of trusting a fixed list',
      },
    ],
  },
  {
    version: 'v0.44.0',
    date: '2026-08-17 23:29',
    missions: ['MIS-085'],
    entries: [
      {
        type: 'NEW',
        text: 'El Narrador: the Codex reads itself aloud with your device’s own voice — the sounding paragraph carries a solar rule and the page follows it, at the pace you choose',
      },
      {
        type: 'NEW',
        text: 'Every term knows its way home: the first mention of Velo, Prisma or any glossary word in a chapter now links quietly to its definition',
      },
      {
        type: 'FIX',
        text: 'The reading bar truly travels with you at last — compact while you read, never gone — so the bookmark, the index and the chapter arrows in the footer are always one tap away, and the final paragraph of a chapter can finally be marked',
      },
    ],
  },
  {
    version: 'v0.43.0',
    date: '2026-08-17 22:06',
    missions: ['MIS-085'],
    entries: [
      {
        type: 'NEW',
        text: 'The character sheet speaks the manual v0.6.0: gears from zero to five, only the competences of your Guild, Faction and Species awake, your Position sets Umbral and aptitudes — and your character lives on your device and in the files you take, nowhere else',
      },
      {
        type: 'UPD',
        text: 'The Procurators follow the manual: the Legates now keep the law, and the Syndics answer to Mercurials and Intendants',
      },
    ],
  },
  {
    version: 'v0.42.0',
    date: '2026-08-17 21:36',
    missions: ['MIS-085'],
    entries: [
      {
        type: 'NEW',
        text: 'The book travels free: the whole manual as a print-ready PDF and a Kindle-ready EPUB, typeset by the same hands that set the web pages — no login, ever',
      },
    ],
  },
  {
    version: 'v0.41.0',
    date: '2026-08-17 20:30',
    missions: ['MIS-085'],
    entries: [
      {
        type: 'NEW',
        text: 'The Codex opens: the RPG manual v0.6.0 reads as a printed book — paper grain, engraved corners that draw themselves, its own day and night, a bookmark that remembers your exact paragraph, and a glossary of 79 terms sourced only from the text',
      },
      {
        type: 'UPD',
        text: 'The old manual viewer retires with honors; the Umbral now veils only the reader — the downloads stay open to every traveler',
      },
    ],
  },
  {
    version: 'v0.40.0',
    date: '2026-08-17 14:35',
    entries: [
      {
        type: 'NEW',
        text: 'The city posts its notice at the gate: a combined Terms and Cookies banner on every page — placeholder words for now, real acceptance already recorded, and the metrics only listen once you have said yes',
      },
    ],
  },
  {
    version: 'v0.39.2',
    date: '2026-08-17 09:30',
    entries: [
      {
        type: 'FIX',
        text: 'The Worker finally reads its own secrets: the bundler had frozen the environment to an empty page, so auth answered "not configured" forever — the city now asks workerd directly, and the deploy smoke test will never believe a hollow 401 again',
      },
    ],
  },
  {
    version: 'v0.39.1',
    date: '2026-08-17 08:03',
    entries: [
      {
        type: 'FIX',
        text: 'Login follows the gate you entered by: the wallet now signs for the domain in your address bar — numinia.com and numinia.store alike — and unknown hosts are turned away at the door',
      },
    ],
  },
  {
    version: 'v0.39.0',
    date: '2026-08-16 07:40',
    entries: [
      {
        type: 'UPD',
        text: 'The L.A.P. tries the middle width: an 85rem centered tool standard, keeping the rhythm of the city — only the admin table keeps the full canvas',
      },
    ],
  },
  {
    version: 'v0.38.1',
    date: '2026-08-16 07:10',
    entries: [
      {
        type: 'FIX',
        text: 'Embedded textures truly cross the wall now: fetch of blob resources is governed by connect-src, not img-src — the live probe caught it',
      },
    ],
  },
  {
    version: 'v0.38.0',
    date: '2026-08-16 06:55',
    entries: [
      {
        type: 'FIX',
        text: 'The 3D viewer keeps its square: models no longer stretch when the screen narrows',
      },
      {
        type: 'FIX',
        text: 'This timeline now tells the truth: every hour is the sealing commit, in real UTC, and versions carry their mission ids',
      },
      {
        type: 'FIX',
        text: 'Docs healed: dead legacy links replaced, tables dressed in the house style, developer pages tell the current story',
      },
      {
        type: 'UPD',
        text: 'One veil for all the art — the nine images now share the same luminance band',
      },
      {
        type: 'UPD',
        text: 'The login widget wears Khepri in Diurno and Nocturno, and the city chapters ride one scrolling row on phones',
      },
    ],
  },
  {
    version: 'v0.37.0',
    date: '2026-08-16 06:12',
    entries: [
      {
        type: 'FIX',
        text: 'The models wear their textures again — the walls learned that embedded textures travel as blobs',
      },
      {
        type: 'FIX',
        text: 'Avatars frame head to toe: the viewer measures each VRM instead of guessing',
      },
      {
        type: 'NEW',
        text: 'The waiting moon cycles through its eight phases wherever the city loads, and music previews wear their notes',
      },
    ],
  },
  {
    version: 'v0.36.0',
    date: '2026-08-16 05:52',
    entries: [
      {
        type: 'FIX',
        text: 'The 3D viewer works again on numinia.com — model files now travel through our own door',
      },
      {
        type: 'FIX',
        text: 'Zero sideways scroll across all 138 pages — canvases, code blocks, tables and long names learned to fit',
      },
      {
        type: 'UPD',
        text: 'More of the house motion where it belongs: cards lift on hover everywhere, working buttons show their waiting dots',
      },
    ],
  },
  {
    version: 'v0.35.0',
    date: '2026-08-16 05:19',
    missions: ['MISSION-029'],
    entries: [
      {
        type: 'NEW',
        text: 'The city reads your preferences: a dark system gets Nocturno, your browser language finds its door on first visit — and your own choice always wins',
      },
    ],
  },
  {
    version: 'v0.34.0',
    date: '2026-08-16 05:00',
    missions: ['MISSION-021', 'MISSION-028'],
    entries: [
      {
        type: 'NEW',
        text: 'The city watches itself: structured Worker logs, a browser error beacon, and an hourly night watch that raises its own alarm',
      },
      {
        type: 'NEW',
        text: 'The walls go up: CSP and security headers on every response, a rate-limiting doorman on the sensitive doors',
      },
      {
        type: 'NEW',
        text: 'Session secrets rotate gracefully — old sessions live out their hour while new ones sign fresh',
      },
    ],
  },
  {
    version: 'v0.33.0',
    date: '2026-08-16 04:07',
    missions: ['MISSION-017', 'MISSION-018'],
    entries: [
      {
        type: 'UPD',
        text: 'The Archive loses four fifths of its weight: baked 480px thumbnails replace full-size originals (2.4MB → 468KB)',
      },
      {
        type: 'NEW',
        text: 'A performance gate joins the walls: page-weight budgets, zero-JS promises and layout stability, pinned per page',
      },
      {
        type: 'FIX',
        text: 'The 3D islands announce their hydration — no interaction falls into the void again',
      },
    ],
  },
  {
    version: 'v0.32.0',
    date: '2026-08-15 23:28',
    missions: ['MISSION-016'],
    entries: [
      {
        type: 'NEW',
        text: 'The census desk opens in the management zone: look a wallet up, grant a rank, watch it enter history',
      },
      {
        type: 'NEW',
        text: 'Attestations: the city can now issue signed statements the citizen keeps — seals, ranks, thresholds',
      },
      {
        type: 'UPD',
        text: 'Mutation testing hardened the new cores: state 81%→98%, attestations 98.5%, every gap killed by a test',
      },
    ],
  },
  {
    version: 'v0.31.0',
    date: '2026-08-15 23:09',
    missions: ['MISSION-015', 'MISSION-016', 'ADR-018'],
    entries: [
      {
        type: 'NEW',
        text: 'The census arrives (ADR-018): ranks the city grants are remembered, and your session carries them from login',
      },
      {
        type: 'NEW',
        text: 'Rank management API for Archons and Oracles — every grant is an audited commit; no census can mint an Oracle',
      },
    ],
  },
  {
    version: 'v0.30.0',
    date: '2026-08-15 22:40',
    missions: ['MISSION-014'],
    entries: [
      {
        type: 'UPD',
        text: 'The chrome learns to travel light: on phones it takes two tight rows, a third less screen before the city appears',
      },
    ],
  },
  {
    version: 'v0.29.0',
    date: '2026-08-15 22:27',
    missions: ['MISSION-013'],
    entries: [
      {
        type: 'NEW',
        text: 'The character sheet exports to PDF: the print dialog hands you the file, clean sheet only',
      },
      {
        type: 'NEW',
        text: 'Prestige and Prisma probes on the sheet, like the old citizen view',
      },
    ],
  },
  {
    version: 'v0.28.0',
    date: '2026-08-15 22:18',
    missions: ['MISSION-012'],
    entries: [
      {
        type: 'NEW',
        text: 'Portals of Numinia: the city map with its 14 open worlds around the Agora Plaza, from the domain model',
      },
      {
        type: 'NEW',
        text: 'Portal constants join the domain: 13 district worlds + the hub, five locales, 100% covered',
      },
      {
        type: 'UPD',
        text: 'The L.A.P. mobile rail reads honestly: per-side fades only where content hides, items snap into place',
      },
    ],
  },
  {
    version: 'v0.27.0',
    date: '2026-08-15 18:15',
    missions: ['MISSION-011'],
    entries: [
      {
        type: 'NEW',
        text: 'The management zone opens for Oracles: the whole archive in one table, sortable and searchable',
      },
      {
        type: 'UPD',
        text: 'The player area now fills the screen, edge to edge, like the tool it is',
      },
      {
        type: 'UPD',
        text: 'One iconography everywhere — the citizenship card speaks the same language as the rest',
      },
    ],
  },
  {
    version: 'v0.26.0',
    date: '2026-08-15 17:45',
    entries: [
      {
        type: 'UPD',
        text: 'The player area looks like one: your citizenship card, the scarab in pixels, seals and prisma at a glance',
      },
      {
        type: 'UPD',
        text: 'The door is always in sight — enter Numinia from any page of the city',
      },
    ],
  },
  {
    version: 'v0.25.0',
    date: '2026-08-15 17:35',
    missions: ['MISSION-010', 'MISSION-002'],
    entries: [
      {
        type: 'NEW',
        text: 'Settings: appearance, language, which panel sections you keep, and what your rank grants',
      },
      {
        type: 'NEW',
        text: 'Enter Numinia from the L.A.P.: Google, email, passkey or your own wallet — never a wall',
      },
      {
        type: 'UPD',
        text: 'Your preferences live in this browser; your sheet lives in your file. Nothing on our servers',
      },
    ],
  },
  {
    version: 'v0.24.0',
    date: '2026-08-15 17:10',
    missions: ['MISSION-009'],
    entries: [
      {
        type: 'NEW',
        text: 'The Manual opens in the Codex: the founding role-playing text, chapter by chapter',
      },
      {
        type: 'NEW',
        text: 'Archive statistics: what exists, where it lives, and how much of it is kept twice',
      },
      {
        type: 'UPD',
        text: 'Verified on Chromium and Firefox at phone, tablet and desktop — and readable with JavaScript off',
      },
    ],
  },
  {
    version: 'v0.23.0',
    date: '2026-08-15 16:15',
    entries: [
      {
        type: 'UPD',
        text: 'The L.A.P. sidebar folds to an icon rail — every section wears its Phosphor glyph',
      },
    ],
  },
  {
    version: 'v0.22.0',
    date: '2026-08-15 15:55',
    missions: ['MISSION-008'],
    entries: [
      {
        type: 'NEW',
        text: 'The L.A.P. becomes a platform: sidebar, character sheet, codex — open to every Nomad',
      },
      {
        type: 'NEW',
        text: 'Your character sheet is a file you own: edit it, export it as Markdown, bring it back',
      },
      {
        type: 'NEW',
        text: 'The Codex: every species, guild, faction, district, archetype and humor the city records',
      },
      {
        type: 'NEW',
        text: 'Dice at the table: a stat of N rolls N six-sided dice, results in plain sight',
      },
    ],
  },
  {
    version: 'v0.21.0',
    date: '2026-08-15 14:52',
    entries: [
      {
        type: 'UPD',
        text: 'The scarab signs the page: Khepri closes every footer, as the house rule commands',
      },
      {
        type: 'UPD',
        text: 'The city sheds its duplicate wordmark; grids across the site now reveal as you arrive',
      },
    ],
  },
  {
    version: 'v0.20.0',
    date: '2026-08-15 14:39',
    missions: ['MISSION-007'],
    entries: [
      {
        type: 'NEW',
        text: 'The City becomes one chronicle: four chapters in a single scroll, from the Seed to the Game',
      },
      {
        type: 'NEW',
        text: 'The numinia.com canon moves in: its words, its art, its seals — now dressed in Khepri',
      },
      {
        type: 'NEW',
        text: 'A waxing moon marks your reading — finish the chronicle and it turns full',
      },
      {
        type: 'UPD',
        text: 'Old city subpages now lead to their chapters; the merge plan for numinia.com is written',
      },
    ],
  },
  {
    version: 'v0.19.0',
    date: '2026-08-15 14:13',
    missions: ['MISSION-006'],
    entries: [
      {
        type: 'NEW',
        text: 'The platform wears Khepri: the Numen Games design system, in Diurno and Nocturno',
      },
      {
        type: 'NEW',
        text: 'Mode toggle (sun/moon), language menu, Phosphor iconography, the typing headline',
      },
      {
        type: 'UPD',
        text: 'Every surface redressed: ink for what acts, amber for what labels, Mono for what measures',
      },
      {
        type: 'UPD',
        text: 'The binary separator now speaks — decode it and find the promise of the house',
      },
    ],
  },
  {
    version: 'v0.18.0',
    date: '2026-08-15 12:15',
    missions: ['MISSION-002'],
    entries: [
      {
        type: 'NEW',
        text: 'Progressive identity spike: enter with Google, an email code, a passkey, or your own wallet (MISSION-002 Step 0)',
      },
      {
        type: 'NEW',
        text: 'Sessions are Numinia-issued: the vendor only proves the address; the keys and the trust stay ours',
      },
      {
        type: 'NEW',
        text: 'Guided login: a live 1-2-3 progress bar walks each method, reacting to what you choose',
      },
      {
        type: 'NEW',
        text: '"Digital ownership, not digital rental" — the data-dignity line debuts at the login (MISSION-005 seed)',
      },
    ],
  },
  {
    version: 'v0.17.0',
    date: '2026-08-15 08:48',
    missions: ['MISSION-001', 'MISSION-003', 'MISSION-004'],
    entries: [
      {
        type: 'NEW',
        text: 'Three pillars: La Ciudad (the Numinia narrative), Assets hub, and L.A.P.',
      },
      { type: 'NEW', text: 'The Archive: every public asset in 5 locales with search and filters' },
      { type: 'NEW', text: 'Gallery: the avatars of the city, collection by collection' },
      { type: 'NEW', text: 'Finder: three-pane collection explorer with batch download' },
      { type: 'NEW', text: '3D Inspector: local GLB/VRM preview + metadata, fully in-browser' },
      { type: 'NEW', text: 'Resources: the 22 original docs pages rebuilt (en/ja)' },
      { type: 'NEW', text: 'Updates timeline + legal draft pages; version linked in the footer' },
      { type: 'NEW', text: 'Site chrome: header, footer, and a no-JS language selector' },
      { type: 'UPD', text: 'SEO: sitemap, robots.txt, canonical, hreflang, meta/OG on every page' },
      { type: 'UPD', text: 'Link-integrity gate: 8,404 internal links checked on every build' },
    ],
  },
  {
    version: 'v0.16.0',
    date: '2026-08-14 20:08',
    missions: ['MISSION-000'],
    entries: [
      {
        type: 'NEW',
        text: 'Full platform rebuild: Astro + Turborepo monorepo (code razed, design preserved)',
      },
      {
        type: 'NEW',
        text: 'Domain model regenerated from the seminal corpus (guilds, ranks, seals, assets)',
      },
      {
        type: 'UPD',
        text: 'Quality floor: 100% domain coverage, mutation testing, WCAG gate, bundle budgets',
      },
      { type: 'UPD', text: 'Hermetic builds from committed catalog snapshots (File Over App)' },
    ],
  },
];

/**
 * Newest version of a timeline; the sentinel keeps an empty table from
 * crashing module load so data regressions fail in tests, not at import.
 */
export function newestVersion(updates: readonly UpdateVersion[]): string {
  const first = updates[0];
  return first ? first.version : 'v0.0.0';
}

/** The version the site footer advertises — always the newest timeline entry. */
export const CURRENT_VERSION: string = newestVersion(REBUILD_UPDATES);

type RoadmapStatus = 'planned' | 'research';

export interface RoadmapItem {
  readonly item: string;
  readonly status: RoadmapStatus;
}

// Tolerates prettier's column padding in the markdown table.
const ROADMAP_ROW = /^\| (.+?) *\| *(planned|research) *\|$/;

/** Parse the "Incoming roadmap" table rows from the extracted record. */
export function parseRoadmap(markdown: string): readonly RoadmapItem[] {
  const items: RoadmapItem[] = [];
  for (const line of markdown.split('\n')) {
    const row = ROADMAP_ROW.exec(line);
    if (row) {
      items.push({ item: row[1] as string, status: row[2] as RoadmapStatus });
    }
  }
  return items;
}

async function readRecord(): Promise<string> {
  return legacyChangelog;
}

/**
 * Pending work of the rebuild, shown above the legacy roadmap. An item
 * leaves this list in the pull request that does it.
 */
export const PENDING: readonly RoadmapItem[] = [
  {
    item: 'Cookie notice in Japanese and Korean: today it shows the English text. The Brazilian Portuguese text has not been read by a native speaker. Both need a human translation before they count as legal text; no machine translation.',
    status: 'planned',
  },
];

/** The pending work, then the legacy "Incoming" roadmap as the original LAP/updates page showed it. */
export async function loadRoadmap(): Promise<readonly RoadmapItem[]> {
  return [...PENDING, ...parseRoadmap(await readRecord())];
}

const VERSION_HEADING = /^## (v\d+\.\d+\.\d+) — (.+)$/;
const ENTRY_LINE = /^- (NEW|FIX|UPD) — (.+)$/;

/** Parse the extracted legacy changelog markdown into structured versions. */
export function parseLegacyChangelog(markdown: string): readonly UpdateVersion[] {
  const versions: { version: string; date: string; entries: UpdateEntry[] }[] = [];
  for (const line of markdown.split('\n')) {
    const heading = VERSION_HEADING.exec(line);
    if (heading) {
      versions.push({ version: heading[1] as string, date: heading[2] as string, entries: [] });
      continue;
    }
    const entry = ENTRY_LINE.exec(line);
    if (entry && versions.length > 0) {
      versions[versions.length - 1]!.entries.push({
        type: entry[1] as UpdateEntryType,
        text: entry[2] as string,
      });
    }
  }
  return versions;
}

/** Full timeline, newest first: rebuild versions then the legacy record. */
export async function loadUpdates(): Promise<readonly UpdateVersion[]> {
  return [...REBUILD_UPDATES, ...parseLegacyChangelog(await readRecord())];
}
