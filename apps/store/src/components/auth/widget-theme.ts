/**
 * Khepri dress for the thirdweb widget (Oracle 2026-08-16): the vendor modal
 * is the one surface our CSS cannot reach, so both modes are mirrored here
 * from the kit palette (khepri/kit/khepri.css) — never invent a color.
 */

import { useEffect, useState } from 'react';
import { darkTheme, lightTheme, type Theme } from 'thirdweb/react';

export type Modo = 'diurno' | 'nocturno';

/** Follows html[data-modo] live, so the widget flips with the mode toggle. */
export function useModo(): Modo {
  const [modo, setModo] = useState<Modo>('diurno');
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setModo(root.dataset['modo'] === 'nocturno' ? 'nocturno' : 'diurno');
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-modo'] });
    return () => observer.disconnect();
  }, []);
  return modo;
}

export const WIDGET_THEMES: Readonly<Record<Modo, Theme>> = {
  nocturno: darkTheme({
    colors: {
      modalBg: '#1E1A17',
      tertiaryBg: '#292420',
      secondaryButtonBg: '#292420',
      secondaryButtonHoverBg: '#3A332D',
      borderColor: '#3A332D',
      separatorLine: '#3A332D',
      skeletonBg: '#292420',
      primaryText: '#F9EBDC',
      secondaryText: '#C4B5A6',
      accentText: '#A6DAD5',
      accentButtonBg: '#EFA517',
      accentButtonText: '#14110F',
      primaryButtonBg: '#F9EBDC',
      primaryButtonText: '#14110F',
      connectedButtonBg: '#1E1A17',
      connectedButtonBgHover: '#292420',
    },
  }),
  diurno: lightTheme({
    colors: {
      modalBg: '#FDF6EE',
      tertiaryBg: '#F9EBDC',
      secondaryButtonBg: '#F9EBDC',
      secondaryButtonHoverBg: '#E2D3C2',
      borderColor: '#E2D3C2',
      separatorLine: '#E2D3C2',
      skeletonBg: '#F9EBDC',
      primaryText: '#14110F',
      secondaryText: '#4A423B',
      accentText: '#016E7D',
      accentButtonBg: '#14110F',
      accentButtonText: '#F9EBDC',
      primaryButtonBg: '#14110F',
      primaryButtonText: '#F9EBDC',
      connectedButtonBg: '#FDF6EE',
      connectedButtonBgHover: '#F9EBDC',
    },
  }),
};
