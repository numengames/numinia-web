/**
 * «Ajustes» (the panel's last piece, cut 8): what the community decides about
 * its own panel — which pieces it has on, what the panel calls things, and,
 * read-only, how the house comes in. The till is the lock: anyone in the
 * community reads, only whoever may manage it (`manage-organization`)
 * changes, and every change is a line of the log.
 *
 * The house's access is text, not a switch: it stays always-on during the
 * alpha, and a control that did nothing would be a lie.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../../i18n/panel';
import type { PanelSettingsMessages } from '../../i18n/panel-settings';
import type { PanelTermsMessages } from '../../i18n/panel-terms';
import { fill, type DeskSettings, type DeskSettingsChange } from '../../lib/accounts';
import { PIECES, type BuiltPiece } from '../../lib/panel';
import {
  VOCABULARIES,
  formatUsdCents,
  isOn,
  isSwitchable,
  type Vocabulary,
} from '../../lib/panel-settings';
import { loadSettings, saveSettings } from '../../lib/panel-settings-client';
import { LunaEspera } from '../chrome/LunaEspera';
import { PanelFrame, type PanelContext } from './PanelFrame';
import { PanelGlyph } from './PanelGlyph';
import { PanelNormas } from './PanelNormas';

type Read = { readonly at: 'loading' } | { readonly at: 'failed' } | { readonly at: 'ready' };
type Saving = 'idle' | 'saving' | 'saved' | 'failed';

const BUILT = PIECES.filter((piece) => piece.kind === 'built');

function Settings({
  org,
  base,
  panel,
  ui,
  terms,
  locale,
}: {
  readonly org: string;
  /** The panel's own words, before any preset: what «Mixto» says. */
  readonly base: PanelMessages;
  readonly panel: PanelContext;
  readonly ui: PanelSettingsMessages;
  readonly terms: PanelTermsMessages;
  readonly locale: SupportedLocale;
}) {
  const { update } = panel;
  const [read, setRead] = useState<Read>({ at: 'loading' });
  const [mine, setMine] = useState<DeskSettings | null>(null);
  const [saving, setSaving] = useState<Saving>('idle');

  const load = useCallback(async (): Promise<void> => {
    setRead({ at: 'loading' });
    const settings = await loadSettings(fetch, org);
    setMine(settings);
    setRead(settings === null ? { at: 'failed' } : { at: 'ready' });
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (change: DeskSettingsChange): Promise<void> => {
    setSaving('saving');
    const saved = await saveSettings(fetch, org, change);
    if (saved === null) {
      setSaving('failed');
      return;
    }
    setMine(saved);
    update(saved);
    setSaving('saved');
  };

  if (read.at === 'loading') {
    return (
      <p className="saldo-estado" role="status">
        <LunaEspera /> {ui.loading}
      </p>
    );
  }
  if (read.at === 'failed' || mine === null) {
    return (
      <div className="saldo-marco saldo-fallo" role="alert" data-settings-failed>
        <p>{base.desk.failed}</p>
        <div>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => void load()}
            data-metric="panel-settings-retry"
          >
            {base.desk.retry}
          </button>
        </div>
      </div>
    );
  }

  const editable = mine.mayEdit;
  const choose = (vocabulary: Vocabulary): void => {
    if (vocabulary !== mine.vocabulary) void save({ vocabulary });
  };
  const flip = (piece: BuiltPiece): void => {
    const off = isOn(piece, mine.off)
      ? [...mine.off, piece]
      : mine.off.filter((candidate) => candidate !== piece);
    void save({ off });
  };
  const toggleAiAgent = (): void => {
    void save({ aiAgentEnabled: !mine.aiAgent.enabled });
  };

  return (
    <div className="ajustes" data-settings data-state="ready">
      {!editable && (
        <p className="saldo-nota" data-settings-readonly>
          {ui.readOnly}
        </p>
      )}

      <section className="tarjeta ajustes-tarjeta" aria-labelledby="settings-pieces-t">
        <h2 className="ajustes-h2" id="settings-pieces-t">
          <PanelGlyph name="squares-four" size={18} />
          {ui.pieces.title}
        </h2>
        <p className="saldo-nota">{ui.pieces.note}</p>
        <ul className="ajustes-piezas">
          {BUILT.map((piece) => {
            const name = panel.words.names[piece.id];
            const fixed = !isSwitchable(piece.id);
            const on = isOn(piece.id, mine.off);
            return (
              <li
                key={piece.id}
                className="ajustes-pieza"
                data-settings-piece={piece.id}
                data-on={on ? 'true' : 'false'}
              >
                <PanelGlyph name={piece.icon} size={18} />
                <span className="ajustes-pieza-cuerpo">
                  <b>{name}</b>
                  <span>{fixed ? ui.pieces.always : on ? ui.pieces.on : ui.pieces.off}</span>
                </span>
                {!fixed && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={fill(ui.pieces.switchLabel, { piece: name })}
                    className="gente-interruptor"
                    disabled={!editable || saving === 'saving'}
                    onClick={() => flip(piece.id)}
                    data-metric={`panel-settings-piece-${piece.id}`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="tarjeta ajustes-tarjeta" aria-labelledby="settings-words-t">
        <h2 className="ajustes-h2" id="settings-words-t">
          <PanelGlyph name="scroll" size={18} />
          {ui.words.title}
        </h2>
        <p className="saldo-nota">{ui.words.note}</p>
        <div className="gente-seg" role="group" aria-label={ui.words.label}>
          {VOCABULARIES.map((vocabulary) => (
            <button
              key={vocabulary}
              type="button"
              aria-pressed={mine.vocabulary === vocabulary}
              disabled={!editable || saving === 'saving'}
              onClick={() => choose(vocabulary)}
              data-metric={`panel-settings-words-${vocabulary}`}
            >
              {ui.words.presets[vocabulary]}
            </button>
          ))}
        </div>
        <p className="saldo-nota" data-settings-now>
          {fill(ui.words.now, {
            venues: panel.words.names.venues,
            gatherings: panel.words.names.gatherings,
            owner: panel.words.standing.as.owner,
          })}
        </p>
      </section>

      <section
        className="tarjeta ajustes-tarjeta"
        aria-labelledby="settings-house-t"
        data-settings-house
      >
        <h2 className="ajustes-h2" id="settings-house-t">
          <PanelGlyph name="shield-check" size={18} />
          {ui.house.title}
        </h2>
        <p>{ui.house.text}</p>
        <p className="saldo-nota">{ui.house.alpha}</p>
      </section>

      <section
        className="tarjeta ajustes-tarjeta"
        aria-labelledby="settings-ai-agent-t"
        data-settings-ai-agent
        data-ai-agent-enabled={mine.aiAgent.enabled ? 'true' : 'false'}
      >
        <h2 className="ajustes-h2" id="settings-ai-agent-t">
          <PanelGlyph name="robot" size={18} />
          {ui.aiAgent.title}
        </h2>
        <div className="ajustes-pieza">
          <span className="ajustes-pieza-cuerpo">
            <p data-ai-agent-line>
              {fill(mine.aiAgent.enabled ? ui.aiAgent.lineOn : ui.aiAgent.lineOff, {
                model: mine.aiAgent.model,
                cap: formatUsdCents(mine.aiAgent.trialCapCents, locale),
              })}
            </p>
            <p className="saldo-nota" data-ai-agent-spend>
              {mine.aiAgent.spentCents >= mine.aiAgent.trialCapCents
                ? fill(ui.aiAgent.exhausted, {
                    cap: formatUsdCents(mine.aiAgent.trialCapCents, locale),
                  })
                : fill(ui.aiAgent.remaining, {
                    left: formatUsdCents(
                      mine.aiAgent.trialCapCents - mine.aiAgent.spentCents,
                      locale,
                    ),
                    cap: formatUsdCents(mine.aiAgent.trialCapCents, locale),
                  })}
            </p>
            <p className="saldo-nota">{ui.aiAgent.note}</p>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={mine.aiAgent.enabled}
            aria-label={ui.aiAgent.switchLabel}
            className="gente-interruptor"
            disabled={!editable || saving === 'saving'}
            onClick={toggleAiAgent}
            data-metric="panel-settings-ai-agent-toggle"
          />
        </div>
      </section>

      <PanelNormas org={org} ui={terms} locale={locale} />

      <p className="saldo-nota" role="status" data-settings-status={saving}>
        {saving === 'saving' && ui.saving}
        {saving === 'saved' && ui.saved}
        {saving === 'failed' && ui.failed}
      </p>
    </div>
  );
}

export function PanelAjustes({
  locale,
  words,
  ui,
  terms,
  signIn,
  saldoHref,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly ui: PanelSettingsMessages;
  readonly terms: PanelTermsMessages;
  readonly signIn: string;
  readonly saldoHref: string;
}) {
  return (
    <PanelFrame locale={locale} face="settings" words={words} signIn={signIn} saldoHref={saldoHref}>
      {(team, panel) => (
        <Settings
          key={team.id}
          org={team.id}
          base={words}
          panel={panel}
          ui={ui}
          terms={terms}
          locale={locale}
        />
      )}
    </PanelFrame>
  );
}
