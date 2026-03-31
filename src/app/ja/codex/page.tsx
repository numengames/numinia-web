import type { Metadata } from 'next';
import { CodexWrapper } from '@/components/codex/CodexWrapper';

export const metadata: Metadata = {
  title: 'El Códice de las Brumas — Numinia RPG',
  description:
    'Numiniaのロールプレイングゲームのルールブック。蒸気とコードの間にある都市国家を舞台にした物語RPG。',
  openGraph: {
    title: 'Numinia — El Códice de las Brumas',
    description: 'Numinia RPGのインタラクティブなルールブック。',
    type: 'website',
  },
};

export default function CodexPage() {
  return <CodexWrapper />;
}
