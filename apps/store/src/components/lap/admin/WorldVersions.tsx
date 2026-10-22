/**
 * The «Versiones» block of a world's card: a world keeps up to two versions,
 * one published (the one people visit, its folder never moves) and one that
 * waits beside it. One line per version — its number, a mark on the published
 * one, how it came to be, when, about how big — with what may be done to it:
 * download, duplicate (the published one, while it is alone), publish and
 * delete (the other). A version on its way (a copy being made, a zip
 * arriving) is a line of its own and quiets the buttons.
 *
 * Shown only where the machine's door says it keeps versions and lists them.
 * What may be offered is decided in lib/worlds.ts (versionBlock); this only
 * draws it and tells the room what was clicked.
 */

import { formatSize, type VersionKind } from '../../../lib/fleet';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  describeComing,
  fill,
  formatVersionDate,
  versionBlock,
  versionNo,
  type VersionLine,
  type WorldRow,
} from '../../../lib/worlds';
import { LunaEspera } from '../../chrome/LunaEspera';

/** What a version's buttons ask for. */
export type VersionAction = 'publish' | 'delete' | 'duplicate' | 'download';

/** The version requests the room follows after its machine took them (a download waits in its dialog). */
export type FollowedKind = Extract<
  VersionKind,
  'PublishVersion' | 'DuplicateVersion' | 'DeleteVersion'
>;

/** A signed version request the machine took and has not finished, followed by the room. */
export interface VersionJob {
  readonly machine: string;
  readonly world: string;
  readonly kind: FollowedKind;
  /** The version asked about (`v2`). */
  readonly version: string;
  /** The request's number, to ask its machine how it goes. */
  readonly request: string;
}

/** What the cards need to draw and drive their version blocks. */
export interface VersionsView {
  /** How many versions the world's machine keeps at most; null when its door says none. */
  readonly max: (row: WorldRow) => number | null;
  readonly onAsk: (row: WorldRow, action: VersionAction, version: string) => void;
  /** The request of this tab still on its way for a world, by world. */
  readonly following: ReadonlyMap<string, FollowedKind>;
  /** The version a duplicate or zip just made, to show for a moment. */
  readonly made: { readonly world: string; readonly version: string } | null;
}

function Line({
  row,
  line,
  words,
  onAsk,
  fresh,
  lang,
}: {
  readonly row: WorldRow;
  readonly line: VersionLine;
  readonly words: WorldsRoomMessages['versions'];
  readonly onAsk: VersionsView['onAsk'];
  readonly fresh: boolean;
  readonly lang: string | undefined;
}) {
  const label = fill(words.label, { n: versionNo(line.id) });
  const origin = fill(words.origin[line.origin.key], {
    n: line.origin.from === null ? '' : versionNo(line.origin.from),
  });
  const button = (action: VersionAction, text: string, extra = '') => (
    <button
      type="button"
      className={`btn btn-fantasma${extra}`}
      onClick={() => onAsk(row, action, line.id)}
      aria-label={`${text} · ${label}`}
      data-metric={`worlds-version-${action}`}
    >
      {text}
    </button>
  );
  return (
    <li
      data-version={line.id}
      data-published={line.published ? 'yes' : 'no'}
      data-new={fresh ? 'yes' : undefined}
    >
      <p className="version-nombre">
        <strong>{label}</strong>
        {line.published && <span className="marca publicada">{words.published}</span>}
      </p>
      <p className="nota version-datos">
        <span>{origin}</span>
        {line.createdAt !== null && (
          <>
            {' · '}
            <time dateTime={line.createdAt}>{formatVersionDate(line.createdAt, lang)}</time>
          </>
        )}
        {line.bytes !== null && (
          <>
            {' · '}
            <span
              className="mono"
              data-version-size
              title={line.published ? words.sizeNote : undefined}
            >
              {fill(words.size, { s: formatSize(line.bytes, lang) })}
            </span>
          </>
        )}
      </p>
      <div className="acciones version-acciones">
        {line.canPublish && button('publish', words.publish)}
        {line.canDownload && button('download', words.download)}
        {line.canDuplicate && button('duplicate', words.duplicate)}
        {line.canDelete && button('delete', words.delete, ' peligro')}
      </div>
    </li>
  );
}

/** A world's versions, on its card; nothing when its door keeps none or lists none. */
export function WorldVersions({
  row,
  room,
  view,
  lang,
}: {
  readonly row: WorldRow;
  readonly room: WorldsRoomMessages;
  readonly view: VersionsView;
  readonly lang: string | undefined;
}) {
  // A request of this tab still on its way, or a publication another tab (or the machine) is doing.
  const following = view.following.get(row.id);
  const block = versionBlock(row, view.max(row), following !== undefined);
  if (block === null) return null;
  const going: FollowedKind | undefined =
    following ?? (row.phase === 'switching' ? 'PublishVersion' : undefined);
  const words = room.versions;
  return (
    <section className="versiones" aria-label={words.title} data-versions-of={row.id}>
      <p className="etiqueta">{words.title}</p>
      <ul>
        {block.lines.map((line) => (
          <Line
            key={line.id}
            row={row}
            line={line}
            words={words}
            onAsk={view.onAsk}
            fresh={view.made?.world === row.id && view.made.version === line.id}
            lang={lang}
          />
        ))}
        {block.coming !== null && (
          <li className="llegando" data-version-coming={block.coming.kind} role="status">
            <LunaEspera /> {describeComing(block.coming, words.coming)}
          </li>
        )}
        {going !== undefined && block.coming === null && (
          <li className="llegando" data-version-following={going} role="status">
            <LunaEspera /> {words.following[going]}
          </li>
        )}
      </ul>
      {block.note !== null && (
        <p className="nota" data-versions-note={block.note}>
          {block.note === 'one' ? words.noteOne : words.noteTwo}
        </p>
      )}
    </section>
  );
}
