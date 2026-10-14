/**
 * ORG-012 (numinia-archive STD-051): the code and the register move together.
 * The register is the archive's STD-052; `registers/` keeps a copy of it. This
 * test holds the code to that copy, and the production build holds the copy to
 * the archive's (scripts/fetch-lore.mjs), so neither drifts unseen.
 */
import { describe, expect, it } from 'vitest';
import {
  HOUSE_ACCESS_SETTINGS,
  ORGANIZATION_PERMISSIONS,
  OWNER_ACTS,
  type OrganizationTemplateId,
  type OwnerAct,
} from '../src/types/organization.js';
import {
  MAX_ORGANIZATION_ROLES,
  ORGANIZATION_TEMPLATES,
} from '../src/constants/organization-roles.js';

const [register = ''] = Object.values(
  import.meta.glob<string>('../registers/STD-052-organisation-permissions.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);

/** The text of one `## ` section of the register, up to the next one. */
function section(title: string): string {
  const heading = `\n## ${title}\n`;
  const start = register.indexOf(heading);
  if (start === -1) throw new Error(`STD-052 has no section «${title}»`);
  const rest = register.slice(start + heading.length);
  const end = rest.indexOf('\n## ');
  return end === -1 ? rest : rest.slice(0, end);
}

/** The keys in a table's first column, in order. */
const keys = (text: string): string[] =>
  [...text.matchAll(/^\| `([a-z-]+)` \|/gm)].map((match) => match[1] ?? '');

/** Each line of the register's «Only owners» list, and the acts the code names for it. */
const OWNERS_ONLY: ReadonlyArray<readonly [string, readonly OwnerAct[]]> = [
  [
    'deleting a world, seeing or changing its code, and downloading it;',
    ['delete-world', 'see-world-code', 'download-world'],
  ],
  [
    'closing the organisation or handing it over;',
    ['close-organization', 'hand-over-organization'],
  ],
  ['naming or removing owners;', ['manage-owners']],
  ["setting the house's access.", ['set-house-access']],
];

describe('ORG-012: the code holds what the register STD-052 holds', () => {
  it('the sixteen permissions, in the register’s order', () => {
    expect(keys(section('Permissions'))).toEqual([...ORGANIZATION_PERMISSIONS]);
  });

  it('the acts only owners do, line by line', () => {
    const lines = [...section('Only owners').matchAll(/^- (.+)$/gm)].map((match) => match[1]);
    expect(lines).toEqual(OWNERS_ONLY.map(([line]) => line));
    expect(OWNERS_ONLY.flatMap(([, acts]) => acts)).toEqual([...OWNER_ACTS]);
  });

  it('the cap of roles', () => {
    const cap = /at most (\d+) roles besides the base role/.exec(section('Only owners'));
    expect(Number(cap?.[1])).toBe(MAX_ORGANIZATION_ROLES);
  });

  it('the settings of the house’s access', () => {
    expect(keys(section("The house's access"))).toEqual([...HOUSE_ACCESS_SETTINGS]);
  });

  it('the roles each kind of organisation is born with, with what each carries', () => {
    const rows = [
      ...section('The roles an organisation is born with').matchAll(
        /^\| (Alpha|Team|Community) \| [^|]+ \| ([^|]+) \|$/gm,
      ),
    ];
    const fromRegister = rows.map(([, name = '', cell = '']) => {
      const roles = cell.split(' · ').map((part) => {
        const [label = '', carries = ''] = part.split(': ');
        return [label, [...carries.matchAll(/`([a-z-]+)`/g)].map((match) => match[1])] as const;
      });
      return [name.toLowerCase(), roles] as const;
    });
    const fromCode = Object.values(ORGANIZATION_TEMPLATES).map((template) => [
      template.id,
      [
        ...template.roles.map((role) => [role.name.en, [...role.permissions]] as const),
        ['base role', [...template.base]] as const,
      ],
    ]);
    expect(fromRegister).toEqual(fromCode);
    expect(fromRegister.map(([id]) => id)).toEqual(
      Object.keys(ORGANIZATION_TEMPLATES) as OrganizationTemplateId[],
    );
  });
});
