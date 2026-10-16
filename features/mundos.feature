Feature: Mundos ↔ organizaciones — every world belongs to one organization, placed by the house
  Pablo's decision of 2026-10-16: only the house (the Oracles) assigns each
  world to exactly one organization, and the organization that pays for a world
  is the one that administers it. A world has its own page, public for now;
  people of its organization see an «Administración» block besides. The
  panel's «Sedes» lists the organization's worlds. Verified against the built
  server — started on a free port with throwaway secrets, answered by the
  fixture desk — asked over HTTP with sessions signed by that secret, and
  against the built pages; what the screens do in a browser is
  e2e/mundos.spec.ts.

  Scenario: The house assigns a world to an organization
    Given the built store is running with the house's wallet on the Oracle list
    When the Oracle assigns the unplaced world to "Numen Games"
    Then the house's list of placements says the world belongs to "Numen Games"

  Scenario: Nobody but the house assigns a world
    Given the built store is running with the house's wallet on the Oracle list
    When a stranger tries to assign a world to "Numen Games"
    Then the till refuses it with 403

  Scenario: A member of the organization sees the world in Sedes
    Given the built store is running with the house's wallet on the Oracle list
    When the Oracle assigns the unplaced world to "Numen Games"
    And a member of "Numen Games" lists the worlds of "Numen Games"
    Then the list has the world
    When a person who is not in "La Tarugo" lists the worlds of "La Tarugo"
    Then the till refuses it with 403

  Scenario: Anyone opens the world page, and only the organization's people get the administration
    Given the built store is running with the house's wallet on the Oracle list
    When the Oracle assigns the unplaced world to "Numen Games"
    And anyone opens the page of the world
    Then the page names the world and says it belongs to "Numen Games"
    And the page offers no administration
    When a member of "Numen Games" asks for the page of the world
    Then the page offers the administration

  Scenario: Entrar sends a guest to the world as a guest and a member with a signed pass
    Given the built store is running with the house's wallet on the Oracle list
    When the Oracle assigns the unplaced world to "Numen Games"
    And anyone presses Entrar on the world
    Then they are sent to the world's plain address, with no pass
    When a member of "Numen Games" presses Entrar on the world
    Then they are sent to the world's address with a pass the published key verifies

  Scenario: Sedes and the placement exist in every locale, with registered controls
    Given the store application has been built
    Then every locale has the panel's Sedes with its words
    And every locale's Worlds room carries the words to assign a world to an organization
    And every control of the cut carries a registered data-metric
