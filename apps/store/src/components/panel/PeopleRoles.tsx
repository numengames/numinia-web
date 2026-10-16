/**
 * «Roles» (the panel's roles of one organization): the prototype's editor.
 * On the left (above, on a phone) the owners — not a role — then the roles
 * from the top down with how many hold each, ↑/↓ on the chosen one, «Crear
 * rol» and the rule; the base role last. On the right, the chosen role in
 * three tabs: Aspecto (name, colour, shown apart; save or delete), Permisos
 * (the seventeen in five groups, each a switch, then what only the owners
 * do) and Miembros · N (who holds it; give it, take it).
 *
 * What may be done is the till's (lib/panel-people.ts reads it from the
 * roles view): someone without «Gestionar roles» sees the same screen
 * read-only, and who could change it. Saving a permission is one edit of the
 * role; giving «Administrador» or «Gestionar roles» asks the wallet to sign
 * (./people-desk.ts, the flow Saldo's members tab had).
 */

import { useState, type KeyboardEvent } from 'react';
import {
  OWNER_ACTS,
  ORGANIZATION_PERMISSION_LABELS,
  type OrganizationPermission,
  type SupportedLocale,
} from '@numinia/domain';
import type { PeopleMessages } from '../../i18n/panel-people';
import type { SaldoMessages } from '../../i18n/saldo';
import {
  fill,
  holdersOf,
  needsSignature,
  shortWallet,
  stepPosition,
  type DeskRole,
  type DeskRoles,
} from '../../lib/accounts';
import {
  PERMISSION_GROUPS,
  chosenRole,
  freshRoleName,
  holdersOfRole,
  mayCreateRole,
  mayEditRole,
  newRoleId,
  ownersOf,
  peopleAccess,
  peopleToGive,
  plural,
  sameSet,
  shownOf,
  swatchesFor,
  switchOf,
  toggled,
  type PeopleAccess,
} from '../../lib/panel-people';
import { LunaEspera } from '../chrome/LunaEspera';
import { labelOf, usePeopleDesk, type PeopleDesk } from './people-desk';
import { HouseStrip, PeopleNotices, Person, RoleDot, whoOf } from './PeopleBits';
import { PeopleGlyph } from './PeopleGlyph';

type Tab = 'look' | 'permissions' | 'members';
const TABS: readonly Tab[] = ['look', 'permissions', 'members'];

interface Shared {
  readonly desk: PeopleDesk;
  readonly view: DeskRoles;
  readonly you: string | null;
  readonly people: PeopleAccess;
  readonly locale: SupportedLocale;
  readonly ui: SaldoMessages;
  readonly words: PeopleMessages;
}

/** Aspecto: the name, the colour and whether it shows apart — saved together; and deleting it. */
function Look({
  shared,
  role,
  editable,
  onDeleted,
}: {
  readonly shared: Shared;
  readonly role: DeskRole;
  readonly editable: boolean;
  readonly onDeleted: () => void;
}) {
  const { desk, ui, words } = shared;
  const said = words.roles;
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color);
  const [hoist, setHoist] = useState(role.hoist);
  const [deleting, setDeleting] = useState(false);

  if (role.position === 0) {
    return (
      <div className="roles-aspecto" data-role-look>
        <p className="saldo-nota">{fill(said.baseLook, { name: role.name })}</p>
      </div>
    );
  }
  const swatchName = (swatch: string): string =>
    (said.swatches as Readonly<Record<string, string>>)[swatch] ?? swatch;

  return (
    <div className="roles-aspecto" data-role-look>
      <div className="gente-campo">
        <label htmlFor="rol-nombre">{ui.panel.name}</label>
        <input
          id="rol-nombre"
          value={name}
          maxLength={100}
          autoComplete="off"
          disabled={!editable}
          onChange={(event) => setName(event.target.value)}
          data-metric="panel-role-name"
        />
      </div>
      <fieldset className="gente-campo saldo-fieldset">
        <legend>{ui.panel.color}</legend>
        <div className="gente-muestras">
          <label className="gente-muestra-et">
            <input
              type="radio"
              name="rol-color"
              className="gente-muestra gente-muestra-nada"
              checked={color === null}
              disabled={!editable}
              onChange={() => setColor(null)}
              data-metric="panel-role-color"
            />
            <span>{ui.panel.noColor}</span>
          </label>
          {swatchesFor(role.color).map((swatch) => (
            <label key={swatch} className="gente-muestra-et">
              <input
                type="radio"
                name="rol-color"
                className="gente-muestra"
                style={{ background: swatch }}
                checked={color === swatch}
                disabled={!editable}
                onChange={() => setColor(swatch)}
                data-metric="panel-role-color"
              />
              <span className="sr-only">{swatchName(swatch)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="gente-ajuste">
        <div>
          <b id="rol-aparte-t">{ui.panel.showApart}</b>
          <span id="rol-aparte-d">{said.apartLine}</span>
        </div>
        <button
          type="button"
          role="switch"
          className="gente-interruptor"
          aria-checked={hoist}
          aria-labelledby="rol-aparte-t"
          aria-describedby="rol-aparte-d"
          disabled={!editable}
          onClick={() => setHoist((on) => !on)}
          data-metric="panel-role-hoist"
        />
      </div>
      <div className="gente-ajuste gente-ajuste-idea">
        <div>
          <b>{said.hintTitle}</b>
          <span>{said.hint}</span>
        </div>
      </div>
      {editable && (
        <div className="saldo-botones roles-pie">
          <button
            type="button"
            className="btn btn-primario"
            disabled={desk.busy || name.trim() === ''}
            onClick={() =>
              void desk.act({
                action: 'edit-role',
                roleId: role.id,
                change: { name: name.trim(), color, hoist },
              })
            }
            data-metric="panel-role-save"
          >
            {ui.panel.save}
          </button>
          {role.mayEdit && !deleting && (
            <button
              type="button"
              className="btn btn-silencioso gente-peligro"
              onClick={() => setDeleting(true)}
              data-metric="panel-role-delete"
            >
              {said.delete}
            </button>
          )}
        </div>
      )}
      {deleting && (
        <div className="saldo-confirmar" role="group" aria-label={said.delete} data-role-confirm>
          <p>{fill(ui.panel.confirmRemove, { name: role.name })}</p>
          <div className="saldo-botones">
            <button
              type="button"
              className="btn btn-destructivo"
              disabled={desk.busy}
              onClick={() =>
                void desk
                  .act({ action: 'delete-role', roleId: role.id })
                  .then((now) => now !== null && onDeleted())
              }
              data-metric="panel-role-delete-confirm"
            >
              {ui.panel.confirm}
            </button>
            <button
              type="button"
              className="btn btn-silencioso"
              onClick={() => setDeleting(false)}
              data-metric="panel-role-delete-cancel"
            >
              {ui.panel.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Permisos: a switch per permission, in five groups, and what only the owners do. */
function Permissions({
  shared,
  role,
  editable,
}: {
  readonly shared: Shared;
  readonly role: DeskRole;
  readonly editable: boolean;
}) {
  const { desk, people, locale, ui, words } = shared;
  const said = words.roles;
  const [draft, setDraft] = useState<readonly OrganizationPermission[]>(role.permissions);
  const changed = !sameSet(draft, role.permissions);

  return (
    <div className="roles-permisos" data-role-permissions>
      {role.position === 0 && (
        <p className="saldo-nota">{fill(said.basePermissions, { name: role.name })}</p>
      )}
      {PERMISSION_GROUPS.map((group) => (
        <section key={group.id} className="roles-grupo" aria-labelledby={`grupo-${group.id}`}>
          <h3 className="etiqueta" id={`grupo-${group.id}`}>
            {said.groups[group.id]}
          </h3>
          {group.permissions.map((permission) => {
            const state = switchOf(permission, draft, people, editable);
            const id = `permiso-${permission}`;
            const reason =
              state.why === 'admin' ? said.byAdmin : state.why === 'not-held' ? said.notHeld : null;
            const described = [
              `${id}-d`,
              ...(reason === null ? [] : [`${id}-r`]),
              ...(needsSignature(permission) && editable ? ['permisos-firma'] : []),
            ].join(' ');
            return (
              <div
                key={permission}
                className={permission === 'administrator' ? 'gente-ajuste peligro' : 'gente-ajuste'}
                data-permission-row={permission}
              >
                <div>
                  <b id={id}>{labelOf(permission, locale, words)}</b>
                  <span id={`${id}-d`}>{said.descriptions[permission]}</span>
                  {reason !== null && (
                    <span className="gente-razon" id={`${id}-r`}>
                      {reason}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  className="gente-interruptor"
                  aria-checked={state.on}
                  aria-labelledby={id}
                  aria-describedby={described}
                  disabled={state.disabled || desk.busy}
                  onClick={() => setDraft((now) => toggled(now, permission))}
                  data-metric="panel-role-permission"
                />
              </div>
            );
          })}
        </section>
      ))}
      {editable && (
        <p className="saldo-nota roles-firma" id="permisos-firma">
          {ui.panel.signatureNote}
        </p>
      )}
      {changed && (
        <div className="saldo-botones roles-pie roles-guardar">
          <button
            type="button"
            className="btn btn-primario"
            disabled={desk.busy}
            onClick={() =>
              void desk.act({
                action: 'edit-role',
                roleId: role.id,
                change: { permissions: [...draft] },
              })
            }
            data-metric="panel-role-permissions-save"
          >
            {said.savePermissions}
          </button>
          <button
            type="button"
            className="btn btn-silencioso"
            onClick={() => setDraft(role.permissions)}
            data-metric="panel-role-permissions-reset"
          >
            {said.undo}
          </button>
        </div>
      )}
      <section className="roles-grupo" aria-labelledby="grupo-titulares">
        <h3 className="etiqueta" id="grupo-titulares">
          {said.ownersOnly}
        </h3>
        <ul className="roles-solo" data-owner-acts>
          {OWNER_ACTS.map((act) => (
            <li key={act}>
              <PeopleGlyph name="lock-key" size={16} />
              {said.ownerActs[act]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Miembros · N: who holds the role, × to take it, and «Añadir» to give it. */
function Holders({ shared, role }: { readonly shared: Shared; readonly role: DeskRole }) {
  const { desk, view, you, ui, words } = shared;
  const said = words.roles;
  const candidates = peopleToGive(view, role);
  const [chosen, setChosen] = useState(candidates[0]?.wallet ?? '');
  const pick = candidates.some((member) => member.wallet === chosen)
    ? chosen
    : (candidates[0]?.wallet ?? '');

  if (role.position === 0) {
    return (
      <div className="roles-miembros" data-role-holders>
        <p className="saldo-nota">{fill(said.baseMembers, { name: role.name })}</p>
      </div>
    );
  }
  const holders = holdersOfRole(view, role);
  return (
    <div className="roles-miembros" data-role-holders>
      {holders.length === 0 ? (
        <p className="saldo-nota">{ui.panel.noRoles}</p>
      ) : (
        <ul className="roles-gente">
          {holders.map((member) => (
            <li key={member.wallet} data-holder={member.wallet}>
              <Person member={member} you={you} ui={ui} />
              {member.assignable.includes(role.id) && (
                <button
                  type="button"
                  className="gente-chip-x"
                  disabled={desk.busy}
                  aria-label={fill(ui.panel.take, { role: role.name, who: whoOf(member) })}
                  onClick={() =>
                    void desk.act({ action: 'take-role', wallet: member.wallet, roleId: role.id })
                  }
                  data-metric="panel-role-holder-take"
                >
                  <PeopleGlyph name="x" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {candidates.length > 0 && (
        <div className="saldo-linea-form roles-dar">
          <label className="sr-only" htmlFor="rol-dar">
            {said.giveTo}
          </label>
          <select
            id="rol-dar"
            value={pick}
            onChange={(event) => setChosen(event.target.value)}
            data-metric="panel-role-holder-choose"
          >
            {candidates.map((member) => {
              const { name } = shownOf(member);
              const short = shortWallet(member.wallet);
              return (
                <option key={member.wallet} value={member.wallet}>
                  {name === null ? short : `${name} · ${short}`}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={desk.busy}
            onClick={() => void desk.act({ action: 'give-role', wallet: pick, roleId: role.id })}
            data-metric="panel-role-holder-give"
          >
            <PeopleGlyph name="plus" size={16} />
            {said.add}
          </button>
        </div>
      )}
    </div>
  );
}

export function PeopleRoles({
  org,
  locale,
  ui,
  words,
}: {
  readonly org: string;
  readonly locale: SupportedLocale;
  readonly ui: SaldoMessages;
  readonly words: PeopleMessages;
}) {
  const desk = usePeopleDesk(org, ui, words, locale);
  const said = words.roles;
  const [wanted, setWanted] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('permissions');

  if (desk.sheet.at === 'loading') {
    return (
      <div className="saldo-estado" role="status">
        <LunaEspera /> {ui.loading}
      </div>
    );
  }
  if (desk.sheet.at === 'failed') {
    return (
      <div className="saldo-marco saldo-fallo" role="alert">
        <p>{desk.sheet.text}</p>
        <div>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => void desk.reload()}
            data-metric="panel-people-retry"
          >
            {ui.retry}
          </button>
        </div>
      </div>
    );
  }

  const { view, you } = desk.sheet;
  const people = peopleAccess(view, you);
  const shared: Shared = { desk, view, you, people, locale, ui, words };
  const role = chosenRole(view.roles, wanted);
  const manages = people.access.permissions.includes('manage-roles');
  const holders = holdersOf(people.access, 'manage-roles', locale);
  const manageLabel = ORGANIZATION_PERMISSION_LABELS['manage-roles'][locale];

  const create = async (): Promise<void> => {
    const now = await desk.act({
      action: 'create-role',
      role: {
        name: freshRoleName(said.freshName, view.roles),
        color: null,
        hoist: false,
        permissions: [],
      },
    });
    const id = now === null ? null : newRoleId(view, now);
    if (id !== null) {
      setWanted(id);
      setTab('look');
    }
  };

  /** The tabs' keys: ← and → move along them, as a tab list does. */
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, at: number): void => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = TABS[(at + step + TABS.length) % TABS.length] ?? 'look';
    setTab(next);
    document.getElementById(`rol-pestana-${next}`)?.focus();
  };

  const tabName = (id: Tab): string =>
    id === 'members' && role !== null
      ? fill(said.tabs.members, { n: role.members })
      : said.tabs[id];

  // A sheet starts again from the role as it is saved: whenever the till answers it changed.
  const sheetKey =
    role === null
      ? 'none'
      : `${role.id}|${role.name}|${role.color ?? ''}|${String(role.hoist)}|${role.permissions.join(',')}|${role.members}`;

  return (
    <div className="saldo-panel gente gente-roles-ed" data-people-roles>
      {view.as === 'house' && <HouseStrip ui={ui} />}
      {!manages && (
        <p className="saldo-marco saldo-nota roles-solo-mirar" data-roles-readonly>
          {holders === null
            ? fill(said.readOnlyOwners, { act: manageLabel })
            : fill(said.readOnly, { act: manageLabel, holders })}
        </p>
      )}
      <PeopleNotices desk={desk} ui={ui} />

      <div className="roles-ed">
        <div className="roles-izq">
          <div className="saldo-marco roles-lista">
            <div className="roles-titulares" data-roles-owners>
              <PeopleGlyph name="crown" size={18} />
              <div>
                <b>{said.owners}</b>
                <span className="saldo-nota">{said.ownersNote}</span>
                <ul className="roles-gente">
                  {ownersOf(view).map((owner) => (
                    <li key={owner.wallet}>
                      <Person member={owner} you={you} ui={ui} size={24} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ul className="roles-items" aria-label={said.listLabel} data-roles-list>
              {view.roles.map((entry) => {
                const selected = role?.id === entry.id;
                const up = selected && entry.mayEdit ? stepPosition(view.roles, entry, 1) : null;
                const down = selected && entry.mayEdit ? stepPosition(view.roles, entry, -1) : null;
                return (
                  <li key={entry.id} data-role={entry.id}>
                    <button
                      type="button"
                      className="roles-item"
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => setWanted(entry.id)}
                      data-metric="panel-role-select"
                    >
                      {entry.position === 0 ? (
                        <PeopleGlyph name="users-three" size={14} />
                      ) : (
                        <RoleDot color={entry.color} />
                      )}
                      <span className="roles-item-nombre" data-role-name>
                        {entry.name}
                      </span>
                      <span className="sr-only">{plural(entry.members, said.people, locale)}</span>
                      <span className="roles-item-cuantos" aria-hidden="true" data-role-count>
                        {entry.members}
                      </span>
                    </button>
                    {(up !== null || down !== null) && (
                      <span className="roles-mover">
                        {up !== null && (
                          <button
                            type="button"
                            className="gente-flecha"
                            disabled={desk.busy}
                            aria-label={`${ui.panel.moveUp}: ${entry.name}`}
                            onClick={() =>
                              void desk.act({ action: 'move-role', roleId: entry.id, position: up })
                            }
                            data-metric="panel-role-up"
                          >
                            ↑
                          </button>
                        )}
                        {down !== null && (
                          <button
                            type="button"
                            className="gente-flecha"
                            disabled={desk.busy}
                            aria-label={`${ui.panel.moveDown}: ${entry.name}`}
                            onClick={() =>
                              void desk.act({
                                action: 'move-role',
                                roleId: entry.id,
                                position: down,
                              })
                            }
                            data-metric="panel-role-down"
                          >
                            ↓
                          </button>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          {mayCreateRole(people, view) && (
            <button
              type="button"
              className="btn btn-fantasma roles-crear"
              disabled={desk.busy}
              onClick={() => void create()}
              data-metric="panel-role-create"
            >
              <PeopleGlyph name="plus" size={16} />
              {said.create}
            </button>
          )}
          <p className="saldo-nota roles-regla" data-roles-rule>
            {said.rule}
          </p>
        </div>

        {role !== null && (
          <section className="saldo-marco roles-hoja" aria-labelledby="rol-titulo" data-role-sheet>
            <div className="roles-hoja-cabeza">
              <h2 id="rol-titulo">
                <RoleDot color={role.color} />
                <span>{role.name}</span>
              </h2>
              <div className="gente-seg" role="tablist" aria-label={said.tabsLabel}>
                {TABS.map((id, at) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`rol-pestana-${id}`}
                    aria-selected={tab === id}
                    aria-controls="rol-panel"
                    tabIndex={tab === id ? 0 : -1}
                    onClick={() => setTab(id)}
                    onKeyDown={(event) => onTabKey(event, at)}
                    data-metric={`panel-role-tab-${id}`}
                  >
                    {tabName(id)}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="roles-panel"
              role="tabpanel"
              id="rol-panel"
              aria-labelledby={`rol-pestana-${tab}`}
              key={`${tab}|${sheetKey}`}
            >
              {tab === 'look' && (
                <Look
                  shared={shared}
                  role={role}
                  editable={mayEditRole(people, role)}
                  onDeleted={() => setWanted(null)}
                />
              )}
              {tab === 'permissions' && (
                <Permissions shared={shared} role={role} editable={mayEditRole(people, role)} />
              )}
              {tab === 'members' && <Holders shared={shared} role={role} />}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
