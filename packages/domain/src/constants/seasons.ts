/**
 * Season I — The Awakening of the Veil. Eight escape-room adventures in
 * worlds on oncyber, moved from numinia.store (data/seasons/season-001.json
 * in numinia-digital-goods-data) with its Spanish names restored as Spanish
 * and three more locales written. Every adventure is open to everyone; the
 * season pass adds the premium reward of each (archive record OPS-016).
 * ja/ko renderings pending native QA (D9 queue), like the rest of the domain.
 *
 * The price is NOT here: sites read it from the offer record (STD-033 PAY-003).
 */

import type { Adventure, Reward, Season } from '../types/season.js';
import type { LocalizedString } from '../types/i18n.js';

const SEASON_ID = 'season-001';

function reward(
  id: string,
  track: Reward['track'],
  name: LocalizedString,
  description: LocalizedString,
): Reward {
  return { id, track, name, description };
}

export const SEASON_ONE_ADVENTURES: readonly Adventure[] = [
  {
    id: 'adv-001',
    seasonId: SEASON_ID,
    order: 1,
    name: { es: 'Umbral', en: 'Threshold', ja: '閾', ko: '문턱', 'pt-br': 'Limiar' },
    description: {
      es: 'Cruza el umbral del templo egipcio. Descifra los jeroglíficos antiguos para abrir el primer sello.',
      en: 'Cross the threshold into the Egyptian temple. Decipher the ancient hieroglyphs to unlock the first seal.',
      ja: 'エジプトの神殿への入り口を越えよ。古代のヒエログリフを解読し、最初の封印を解け。',
      ko: '이집트 신전의 문턱을 넘어라. 고대 상형문자를 해독해 첫 번째 봉인을 풀어라.',
      'pt-br':
        'Cruze o limiar do templo egípcio. Decifre os hieróglifos antigos para abrir o primeiro selo.',
    },
    worldUrl: 'https://oncyber.io/door_of_anubis',
    durationMinutes: 25,
    difficulty: 4,
    puzzle: 'hieroglyph',
    rewards: [
      reward(
        'loot-f-001',
        'free',
        {
          es: 'Máscara de sombra',
          en: 'Shadow Mask',
          ja: '影の仮面',
          ko: '그림자 가면',
          'pt-br': 'Máscara de Sombra',
        },
        {
          es: 'Una máscara forjada en las sombras del templo de Anubis.',
          en: "A mask forged in the shadows of Anubis' temple.",
          ja: 'アヌビスの神殿の影で鍛えられた仮面。',
          ko: '아누비스 신전의 그림자 속에서 벼려진 가면.',
          'pt-br': 'Uma máscara forjada nas sombras do templo de Anúbis.',
        },
      ),
      reward(
        'loot-p-001',
        'premium',
        {
          es: 'Capa de la noche',
          en: 'Night Cloak',
          ja: '夜のマント',
          ko: '밤의 망토',
          'pt-br': 'Manto da Noite',
        },
        {
          es: 'Una capa etérea tejida con la propia noche.',
          en: 'An ethereal cloak woven from the night itself.',
          ja: '夜そのものから織られた霊妙なマント。',
          ko: '밤 그 자체로 짠 영묘한 망토.',
          'pt-br': 'Um manto etéreo tecido com a própria noite.',
        },
      ),
    ],
  },
  {
    id: 'adv-002',
    seasonId: SEASON_ID,
    order: 2,
    name: {
      es: 'Espejo roto',
      en: 'Broken Mirror',
      ja: '壊れた鏡',
      ko: '깨진 거울',
      'pt-br': 'Espelho Partido',
    },
    description: {
      es: 'El dios halcón vigila. Resuelve los acertijos de lógica reflejados en los espejos rotos de Horus.',
      en: 'The falcon god watches. Solve the logic puzzles reflected in the broken mirrors of Horus.',
      ja: '鷹の神が見守る。ホルスの壊れた鏡に映る論理パズルを解け。',
      ko: '매의 신이 지켜본다. 호루스의 깨진 거울에 비친 논리 퍼즐을 풀어라.',
      'pt-br':
        'O deus falcão observa. Resolva os enigmas de lógica refletidos nos espelhos partidos de Hórus.',
    },
    worldUrl: 'https://oncyber.io/door_of_horus',
    durationMinutes: 12,
    difficulty: 2,
    puzzle: 'logic',
    rewards: [
      reward(
        'loot-f-002',
        'free',
        {
          es: 'Cristal fractal',
          en: 'Fractal Crystal',
          ja: 'フラクタル結晶',
          ko: '프랙탈 수정',
          'pt-br': 'Cristal Fractal',
        },
        {
          es: 'Un fragmento del ojo que todo lo ve de Horus.',
          en: "A shard of Horus' all-seeing eye.",
          ja: 'ホルスの全能の目の破片。',
          ko: '모든 것을 보는 호루스의 눈 조각.',
          'pt-br': 'Um fragmento do olho que tudo vê de Hórus.',
        },
      ),
      reward(
        'loot-p-002',
        'premium',
        {
          es: 'Aura de espejo',
          en: 'Mirror Aura',
          ja: '鏡のオーラ',
          ko: '거울의 오라',
          'pt-br': 'Aura de Espelho',
        },
        {
          es: 'Un aura que refleja la verdad de quien la mira.',
          en: 'An aura that reflects the truth of those who gaze upon it.',
          ja: '見つめる者の真実を映し出すオーラ。',
          ko: '바라보는 이의 진실을 비추는 오라.',
          'pt-br': 'Uma aura que reflete a verdade de quem a contempla.',
        },
      ),
    ],
  },
  {
    id: 'adv-003',
    seasonId: SEASON_ID,
    order: 3,
    name: { es: 'Raíces', en: 'Roots', ja: '根源', ko: '뿌리', 'pt-br': 'Raízes' },
    description: {
      es: 'La biblioteca de Imhotep guarda la llave. Resuelve los rompecabezas tejidos en las raíces del saber antiguo.',
      en: "Imhotep's library holds the key. Solve the brain puzzles woven into the roots of ancient knowledge.",
      ja: 'イムホテプの図書館が鍵を握る。古代の知識の根に織り込まれた頭脳パズルを解け。',
      ko: '임호테프의 도서관이 열쇠를 쥐고 있다. 고대 지식의 뿌리에 엮인 두뇌 퍼즐을 풀어라.',
      'pt-br':
        'A biblioteca de Imhotep guarda a chave. Resolva os quebra-cabeças tecidos nas raízes do saber antigo.',
    },
    worldUrl: 'https://oncyber.io/door_of_imhotep',
    durationMinutes: 20,
    difficulty: 3,
    puzzle: 'brain-puzzle',
    rewards: [
      reward(
        'loot-f-003',
        'free',
        {
          es: 'Corona de raíces',
          en: 'Root Crown',
          ja: '根の冠',
          ko: '뿌리 왕관',
          'pt-br': 'Coroa de Raízes',
        },
        {
          es: 'Una corona crecida del árbol del conocimiento.',
          en: 'A crown grown from the tree of knowledge.',
          ja: '知識の木から育った冠。',
          ko: '지식의 나무에서 자라난 왕관.',
          'pt-br': 'Uma coroa crescida da árvore do conhecimento.',
        },
      ),
      reward(
        'loot-p-003',
        'premium',
        {
          es: 'Botas ancestrales',
          en: 'Ancestral Boots',
          ja: '祖先のブーツ',
          ko: '선조의 장화',
          'pt-br': 'Botas Ancestrais',
        },
        {
          es: 'Unas botas que llevan la sabiduría de los antiguos.',
          en: 'Boots that carry the wisdom of the ancients.',
          ja: '古代の知恵を宿すブーツ。',
          ko: '옛사람들의 지혜를 품은 장화.',
          'pt-br': 'Botas que carregam a sabedoria dos antigos.',
        },
      ),
    ],
  },
  {
    id: 'adv-004',
    seasonId: SEASON_ID,
    order: 4,
    name: { es: 'Marea', en: 'Tide', ja: '潮流', ko: '조류', 'pt-br': 'Maré' },
    description: {
      es: 'Isis gobierna las mareas. Entrena la vista para atravesar las ilusiones del abismo.',
      en: 'Isis commands the tides. Train your eye to see through the illusions of the deep.',
      ja: 'イシスが潮流を支配する。深淵の幻影を見透かす視覚を鍛えよ。',
      ko: '이시스가 조류를 다스린다. 심연의 환영을 꿰뚫어 보도록 눈을 단련하라.',
      'pt-br': 'Ísis comanda as marés. Treine o olhar para enxergar através das ilusões do abismo.',
    },
    worldUrl: 'https://oncyber.io/door_of_isis',
    durationMinutes: 15,
    difficulty: 2,
    puzzle: 'visual-acuity',
    rewards: [
      reward(
        'loot-f-004',
        'free',
        {
          es: 'Gema abisal',
          en: 'Abyssal Gem',
          ja: '深淵の宝石',
          ko: '심연의 보석',
          'pt-br': 'Gema Abissal',
        },
        {
          es: 'Una gema que late al ritmo de las mareas.',
          en: 'A gem that pulses with the rhythm of the tides.',
          ja: '潮流のリズムで脈打つ宝石。',
          ko: '조류의 리듬에 맞춰 고동치는 보석.',
          'pt-br': 'Uma gema que pulsa no ritmo das marés.',
        },
      ),
      reward(
        'loot-p-004',
        'premium',
        {
          es: 'Tridente de niebla',
          en: 'Mist Trident',
          ja: '霧のトライデント',
          ko: '안개의 삼지창',
          'pt-br': 'Tridente da Névoa',
        },
        {
          es: 'Un tridente que gobierna la niebla entre los mundos.',
          en: 'A trident that commands the mist between worlds.',
          ja: '世界の間の霧を操るトライデント。',
          ko: '세계 사이의 안개를 다스리는 삼지창.',
          'pt-br': 'Um tridente que comanda a névoa entre os mundos.',
        },
      ),
    ],
  },
  {
    id: 'adv-005',
    seasonId: SEASON_ID,
    order: 5,
    name: { es: 'Ceniza', en: 'Ash', ja: '灰燼', ko: '재', 'pt-br': 'Cinza' },
    description: {
      es: 'La balanza de Maat pesa tu alma. Escapa de la sala del juicio antes de que las llamas lo consuman todo.',
      en: 'The scales of Maat weigh your soul. Escape the trial chamber before the flames consume everything.',
      ja: 'マアトの天秤が魂を量る。炎がすべてを焼き尽くす前に試練の間から脱出せよ。',
      ko: '마아트의 저울이 너의 영혼을 잰다. 불길이 모든 것을 삼키기 전에 심판의 방에서 탈출하라.',
      'pt-br':
        'A balança de Maat pesa sua alma. Escape da sala do julgamento antes que as chamas consumam tudo.',
    },
    worldUrl: 'https://oncyber.io/door_of_maat',
    durationMinutes: 15,
    difficulty: 3,
    puzzle: 'escape-room',
    rewards: [
      reward(
        'loot-f-005',
        'free',
        {
          es: 'Anillo de fuego',
          en: 'Fire Ring',
          ja: '炎の指輪',
          ko: '불의 반지',
          'pt-br': 'Anel de Fogo',
        },
        {
          es: 'Un anillo forjado en el fuego del juicio.',
          en: 'A ring forged in the fires of judgment.',
          ja: '審判の炎で鍛えられた指輪。',
          ko: '심판의 불길 속에서 벼려진 반지.',
          'pt-br': 'Um anel forjado no fogo do julgamento.',
        },
      ),
      reward(
        'loot-p-005',
        'premium',
        {
          es: 'Hombreras de llama',
          en: 'Flame Pauldrons',
          ja: '炎の肩当て',
          ko: '화염 견갑',
          'pt-br': 'Ombreiras de Chama',
        },
        {
          es: 'Unas hombreras que arden con fuego eterno.',
          en: 'Pauldrons burning with eternal fire.',
          ja: '永遠の炎で燃え続ける肩当て。',
          ko: '영원한 불로 타오르는 견갑.',
          'pt-br': 'Ombreiras que ardem com fogo eterno.',
        },
      ),
    ],
  },
  {
    id: 'adv-006',
    seasonId: SEASON_ID,
    order: 6,
    name: { es: 'Eco', en: 'Echo', ja: 'エコー', ko: '메아리', 'pt-br': 'Eco' },
    description: {
      es: 'Las flechas de Neith se esconden por el templo. Encuentra los secretos repartidos por su dominio.',
      en: "Neith's arrows hide across the temple. Hunt the secrets scattered throughout her domain.",
      ja: 'ネイトの矢が神殿のあちこちに隠されている。彼女の領域に散らばる秘密を探し出せ。',
      ko: '네이트의 화살이 신전 곳곳에 숨어 있다. 그녀의 영역에 흩어진 비밀을 찾아라.',
      'pt-br':
        'As flechas de Neith se escondem pelo templo. Encontre os segredos espalhados por seu domínio.',
    },
    worldUrl: 'https://oncyber.io/door_of_neith',
    durationMinutes: 10,
    difficulty: 1,
    puzzle: 'easter-egg',
    rewards: [
      reward(
        'loot-f-006',
        'free',
        {
          es: 'Colgante del eco',
          en: 'Echo Pendant',
          ja: 'エコーのペンダント',
          ko: '메아리 펜던트',
          'pt-br': 'Pingente do Eco',
        },
        {
          es: 'Un colgante que resuena con verdades ocultas.',
          en: 'A pendant that resonates with hidden truths.',
          ja: '隠された真実と共鳴するペンダント。',
          ko: '숨겨진 진실과 공명하는 펜던트.',
          'pt-br': 'Um pingente que ressoa com verdades ocultas.',
        },
      ),
      reward(
        'loot-p-006',
        'premium',
        {
          es: 'Guantes de resonancia',
          en: 'Resonance Gloves',
          ja: '共鳴のグローブ',
          ko: '공명의 장갑',
          'pt-br': 'Luvas da Ressonância',
        },
        {
          es: 'Unos guantes que amplifican los ecos de los antiguos.',
          en: 'Gloves that amplify the echoes of the ancients.',
          ja: '古代のエコーを増幅するグローブ。',
          ko: '옛사람들의 메아리를 증폭하는 장갑.',
          'pt-br': 'Luvas que amplificam os ecos dos antigos.',
        },
      ),
    ],
  },
  {
    id: 'adv-007',
    seasonId: SEASON_ID,
    order: 7,
    name: { es: 'Nexo', en: 'Nexus', ja: 'ネクサス', ko: '넥서스', 'pt-br': 'Nexo' },
    description: {
      es: 'La diosa leona guarda el laberinto. Recorre el laberinto de Sacmis hasta dar con el punto de nexo.',
      en: 'The lion goddess guards the labyrinth. Walk the maze of Sacmis until you find the nexus point.',
      ja: '獅子の女神が迷宮を守る。サクミスの迷路を進み、ネクサスポイントを見つけよ。',
      ko: '사자 여신이 미궁을 지킨다. 사크미스의 미로를 걸어 넥서스 지점을 찾아라.',
      'pt-br':
        'A deusa leoa guarda o labirinto. Percorra o labirinto de Sacmis até encontrar o ponto de nexo.',
    },
    worldUrl: 'https://oncyber.io/door_of_sacmis',
    durationMinutes: 8,
    difficulty: 1,
    puzzle: 'maze',
    rewards: [
      reward(
        'loot-f-007',
        'free',
        {
          es: 'Orbe del nexo',
          en: 'Nexus Orb',
          ja: 'ネクサスオーブ',
          ko: '넥서스 오브',
          'pt-br': 'Orbe do Nexo',
        },
        {
          es: 'Un orbe que une todos los puntos del espacio.',
          en: 'An orb that connects every point in space.',
          ja: '空間のすべての点をつなぐオーブ。',
          ko: '공간의 모든 점을 잇는 오브.',
          'pt-br': 'Um orbe que conecta todos os pontos do espaço.',
        },
      ),
      reward(
        'loot-p-007',
        'premium',
        {
          es: 'Cinturón de portales',
          en: 'Portal Belt',
          ja: 'ポータルベルト',
          ko: '포털 허리띠',
          'pt-br': 'Cinturão de Portais',
        },
        {
          es: 'Un cinturón que abre puertas entre dimensiones.',
          en: 'A belt that opens doorways between dimensions.',
          ja: '次元の間に扉を開くベルト。',
          ko: '차원 사이에 문을 여는 허리띠.',
          'pt-br': 'Um cinturão que abre portas entre dimensões.',
        },
      ),
    ],
  },
  {
    id: 'adv-008',
    seasonId: SEASON_ID,
    order: 8,
    name: { es: 'El Velo', en: 'The Veil', ja: 'ヴェール', ko: '베일', 'pt-br': 'O Véu' },
    description: {
      es: 'La última puerta. Thot, guardián del conocimiento, pone a prueba todo lo aprendido en las anteriores.',
      en: 'The final door. Thoth, keeper of knowledge, tests your mastery of all that came before.',
      ja: '最後の扉。知識の守護者トトが、これまでのすべての習熟度を試す。',
      ko: '마지막 문. 지식의 수호자 토트가 앞선 모든 것에 대한 너의 숙련을 시험한다.',
      'pt-br':
        'A última porta. Thoth, guardião do conhecimento, testa seu domínio de tudo o que veio antes.',
    },
    worldUrl: 'https://oo.oncyber.io/door_of_thoth',
    durationMinutes: 20,
    difficulty: 4,
    puzzle: 'logic',
    rewards: [
      reward(
        'loot-f-008',
        'free',
        {
          es: 'Sello final',
          en: 'Final Seal',
          ja: '最後の封印',
          ko: '마지막 봉인',
          'pt-br': 'Selo Final',
        },
        {
          es: 'El sello que ata el velo entre los mundos.',
          en: 'The seal that binds the veil between worlds.',
          ja: '世界の間のヴェールを結ぶ封印。',
          ko: '세계 사이의 베일을 묶는 봉인.',
          'pt-br': 'O selo que prende o véu entre os mundos.',
        },
      ),
      reward(
        'loot-p-008',
        'premium',
        {
          es: 'Armadura del velo',
          en: 'Veil Armor',
          ja: 'ヴェールの鎧',
          ko: '베일 갑옷',
          'pt-br': 'Armadura do Véu',
        },
        {
          es: 'Una armadura tejida con la tela del propio velo.',
          en: 'Armor woven from the fabric of the veil itself.',
          ja: 'ヴェールの織物から編まれた鎧。',
          ko: '베일 그 자체의 천으로 짠 갑옷.',
          'pt-br': 'Uma armadura tecida com o tecido do próprio véu.',
        },
      ),
    ],
  },
];

export const SEASON_ONE: Season = {
  id: SEASON_ID,
  status: 'upcoming',
  name: {
    es: 'Temporada I — El Despertar del Velo',
    en: 'Season I — The Awakening of the Veil',
    ja: 'シーズンI — ヴェールの目覚め',
    ko: '시즌 I — 베일의 각성',
    'pt-br': 'Temporada I — O Despertar do Véu',
  },
  description: {
    es: 'Ocho puertas se interponen entre tú y la verdad. Cruza el velo, demuestra lo que vales y reclama los tesoros ocultos en los templos de Numinia.',
    en: 'Eight doors stand between you and the truth. Cross the veil, prove your worth, and claim the treasures hidden in the temples of Numinia.',
    ja: '8つの扉があなたと真実の間に立ちはだかる。ヴェールを越え、己の価値を証明し、ヌミニアの神殿に隠された宝物を手に入れよ。',
    ko: '여덟 개의 문이 너와 진실 사이에 서 있다. 베일을 건너 너의 가치를 증명하고 누미니아의 신전에 숨겨진 보물을 차지하라.',
    'pt-br':
      'Oito portas se erguem entre você e a verdade. Atravesse o véu, prove seu valor e reivindique os tesouros ocultos nos templos de Numinia.',
  },
  // Dates are the Oracle's to set when the pass goes on sale (OPS-016).
  startsAt: null,
  endsAt: null,
  adventures: SEASON_ONE_ADVENTURES,
};

/** Total minutes to play every adventure of a season, for the page's summary line. */
export function seasonMinutes(season: Season): number {
  return season.adventures.reduce((sum, adventure) => sum + adventure.durationMinutes, 0);
}

/** The reward of one track, or undefined when the adventure has none on it. */
export function rewardOn(adventure: Adventure, track: Reward['track']): Reward | undefined {
  return adventure.rewards.find((candidate) => candidate.track === track);
}
