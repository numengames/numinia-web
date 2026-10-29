/**
 * The role colours are written twice: the domain's Team template gives its
 * three roles a colour (Administration, Finance, Member), and the store's
 * palette `SWATCHES` (the Roles editor's swatches) holds the same hex values.
 * Nothing else ties them together, so this test fails when one side changes
 * alone: the screen and the domain would otherwise diverge without a sign.
 */

import { describe, expect, it } from 'vitest';
import { ORGANIZATION_TEMPLATES } from '@numinia/domain';
import { SWATCHES } from '../panel-people';

const teamColours = ORGANIZATION_TEMPLATES.team.roles.flatMap((role) =>
  role.color === undefined ? [] : [role.color],
);

describe('role colours: the domain and the store agree (MIS-266)', () => {
  it('the Team template gives each of its three roles a colour', () => {
    expect(teamColours).toHaveLength(3);
  });

  it('every colour the domain gives a role is one of the store swatches', () => {
    for (const colour of teamColours) {
      expect(SWATCHES, `colour ${colour} of the domain is missing from SWATCHES`).toContain(colour);
    }
  });
});
