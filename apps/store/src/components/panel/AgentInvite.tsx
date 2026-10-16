/**
 * The invitation to an AI of the community, in the panel's «Agentes»: three
 * steps like the world's own (components/mundos/AiSection.tsx — its words,
 * its slug rule and its key rule are reused, lib/world-door.ts):
 *   1. the name and what it may do — «Solo mirar y hablar» carries no role,
 *      «Mirar, hablar y también construir» takes roles among the ones the
 *      asker may assign;
 *   2. the one line that makes its key where it lives, and the public key
 *      it prints, pasted;
 *   3. the summary and «Añadir».
 * Nothing is sent before the last step.
 */

import { useEffect, useRef, useState } from 'react';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import type { WorldAiMessages } from '../../i18n/mundos';
import { fill, type DeskAgent, type DeskAgents } from '../../lib/accounts';
import { invitable, roleIdsFor, type Failure } from '../../lib/panel-agentes';
import {
  NAME_MAX,
  agentIdFrom,
  isAgentKey,
  nameProblem,
  newAgentCommand,
  type Ability,
} from '../../lib/world-door';
import { RoleDot } from './PeopleBits';

export interface Draft {
  readonly id: string;
  readonly name: string;
  readonly publicKey: string;
  readonly roleIds: readonly string[];
}

export function InviteDialog({
  world,
  words,
  view,
  existing,
  failureText,
  onClose,
  onAdd,
}: {
  /** The world page's invitation words, reused as they are. */
  readonly world: WorldAiMessages['dialog'];
  readonly words: AgentesMessages;
  readonly view: Pick<DeskAgents, 'assignableRoles'>;
  readonly existing: readonly DeskAgent[];
  readonly failureText: (failure: Failure) => string;
  readonly onClose: () => void;
  readonly onAdd: (draft: Draft) => Promise<Failure | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [ability, setAbility] = useState<Ability>('talk');
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [key, setKey] = useState('');
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element && !element.open) element.showModal();
  }, []);

  const roles = invitable(view);
  const id = agentIdFrom(name);
  const problem = nameProblem(name);
  const taken = problem === null && existing.some((agent) => agent.id === id);
  const nameError =
    problem === null
      ? taken
        ? world.nameProblems.taken
        : null
      : fill(world.nameProblems[problem], { max: NAME_MAX });
  const rolesError = ability === 'build' && picked.length === 0 ? words.dialog.rolesNeed : null;
  const keyOk = isAgentKey(key);
  const command = newAgentCommand(id, name);
  const chosen = roles.filter((role) => picked.includes(role.id));

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const add = async (): Promise<void> => {
    setBusy(true);
    setFailed(null);
    const result = await onAdd({
      id,
      name: name.trim(),
      publicKey: key.trim(),
      roleIds: roleIdsFor(ability, picked),
    });
    setBusy(false);
    if (result !== null) setFailed(result);
  };

  const togglePicked = (roleId: string): void =>
    setPicked((now) =>
      now.includes(roleId) ? now.filter((entry) => entry !== roleId) : [...now, roleId],
    );

  return (
    <dialog
      ref={ref}
      className="mundo-ia-dialogo"
      aria-label={world.title}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      data-agentes-dialog={step}
    >
      <div className="mundo-ia-cabeza">
        <h2>{world.title}</h2>
        <p className="saldo-nota">{fill(world.step, { n: step })}</p>
      </div>
      <div className="mundo-ia-cuerpo">
        {step === 1 && (
          <>
            <label className="mundo-ia-campo">
              <span>{world.nameLabel}</span>
              <input
                type="text"
                value={name}
                maxLength={NAME_MAX * 2}
                autoComplete="off"
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && nameError !== null}
                aria-describedby="agentes-nombre-pista"
                data-metric="panel-agentes-invite-name"
              />
              <span className="saldo-nota" id="agentes-nombre-pista">
                {touched && nameError !== null ? nameError : world.nameHint}
              </span>
            </label>
            <fieldset className="mundo-ia-opciones">
              <legend>{world.abilityLabel}</legend>
              <label>
                <input
                  type="radio"
                  name="agentes-habilidad"
                  checked={ability === 'talk'}
                  onChange={() => setAbility('talk')}
                  data-metric="panel-agentes-invite-ability-talk"
                />{' '}
                {world.abilityTalk}
              </label>
              <label>
                <input
                  type="radio"
                  name="agentes-habilidad"
                  checked={ability === 'build'}
                  disabled={roles.length === 0}
                  onChange={() => setAbility('build')}
                  data-metric="panel-agentes-invite-ability-build"
                />{' '}
                {world.abilityBuild}
              </label>
              {roles.length === 0 && (
                <span className="saldo-nota" data-agentes-roles-none>
                  {words.dialog.rolesNone}
                </span>
              )}
            </fieldset>
            {ability === 'build' && (
              <fieldset className="mundo-ia-opciones" data-agentes-roles>
                <legend>{words.dialog.rolesLabel}</legend>
                <span className="saldo-nota">{words.dialog.rolesHint}</span>
                {roles.map((role) => (
                  <label key={role.id}>
                    <input
                      type="checkbox"
                      checked={picked.includes(role.id)}
                      onChange={() => togglePicked(role.id)}
                      data-metric="panel-agentes-invite-role"
                    />{' '}
                    <RoleDot color={role.color} />
                    {role.name}
                  </label>
                ))}
                {touched && rolesError !== null && (
                  <span className="fallo" role="alert">
                    {rolesError}
                  </span>
                )}
              </fieldset>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <h3 className="etiqueta">{world.commandTitle}</h3>
            <p className="saldo-nota">{world.commandNote}</p>
            <div className="mundo-ia-linea">
              <code data-agentes-command>{command}</code>
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={() => void copy()}
                data-metric="panel-agentes-invite-copy"
              >
                {copied ? world.copied : world.copy}
              </button>
            </div>
            <label className="mundo-ia-campo">
              <span>{world.keyLabel}</span>
              <input
                type="text"
                className="mono"
                value={key}
                autoComplete="off"
                spellCheck={false}
                placeholder="ed25519:…"
                onChange={(event) => setKey(event.target.value)}
                aria-invalid={key !== '' && !keyOk}
                data-metric="panel-agentes-invite-key"
              />
              {key !== '' && !keyOk && (
                <span className="fallo" role="alert">
                  {world.keyInvalid}
                </span>
              )}
            </label>
          </>
        )}
        {step === 3 && (
          <dl className="mundo-ia-resumen">
            <dt>{world.nameLabel}</dt>
            <dd data-agentes-summary-name>{name.trim()}</dd>
            <dt>{world.abilityLabel}</dt>
            <dd>{ability === 'talk' ? world.abilityTalk : world.abilityBuild}</dd>
            <dt>{words.dialog.summaryRoles}</dt>
            <dd data-agentes-summary-roles>
              {chosen.length === 0 || ability === 'talk'
                ? words.dialog.summaryNone
                : chosen.map((role) => role.name).join(', ')}
            </dd>
          </dl>
        )}
        {failed !== null && (
          <p className="fallo" role="alert" data-agentes-add-failed={failed.kind}>
            {failureText(failed)}
          </p>
        )}
      </div>
      <div className="mundo-ia-pie">
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => ref.current?.close()}
          disabled={busy}
          data-metric="panel-agentes-invite-cancel"
        >
          {world.cancel}
        </button>
        {step > 1 && (
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => {
              setFailed(null);
              setStep(step === 3 ? 2 : 1);
            }}
            disabled={busy}
            data-metric="panel-agentes-invite-back"
          >
            {world.back}
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => {
              setTouched(true);
              if (nameError === null && rolesError === null) setStep(2);
            }}
            data-metric="panel-agentes-invite-next"
          >
            {world.next}
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => setStep(3)}
            disabled={!keyOk}
            data-metric="panel-agentes-invite-next"
          >
            {world.next}
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => void add()}
            disabled={busy}
            aria-busy={busy}
            data-metric="panel-agentes-invite-add"
          >
            {busy ? world.adding : world.add}
          </button>
        )}
      </div>
    </dialog>
  );
}
