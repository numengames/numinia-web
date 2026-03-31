import type { Metadata } from 'next';
import { CodexWrapper } from '@/components/codex/CodexWrapper';

export const metadata: Metadata = {
  title: 'El Códice de las Brumas — Numinia RPG',
  description:
    'Lee el libro de reglas completo de Numinia, el juego de rol narrativo ambientado en una ciudad-estado entre vapor y código. Un códice interactivo con sonido, lectura en voz alta y navegación inmersiva.',
  openGraph: {
    title: 'Numinia — El Códice de las Brumas',
    description:
      'El libro de reglas del juego de rol Numinia. Una experiencia de lectura inmersiva.',
    type: 'website',
  },
};

export default function CodexPage() {
  return <CodexWrapper />;
}
