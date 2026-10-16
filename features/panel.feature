Feature: The organization panel
  Pablo's QA of 2026-10-15 (live v0.95.0): «esto es lo que yo pensaba que
  estábamos haciendo». The roles and members were built, but as a tab of
  Balance reachable from no menu he looked at. The account menu now has one
  door, «Paneles», to /panel/: the organization's panel, with the pieces of
  its rail — Resumen, Miembros, Roles, Saldo y consumo built; the rest
  drawn under construction, never a link that fails; the Oracle's rooms only
  signposted for the Oracle. Verified against the build output, in the five
  locales. What the panel does with each answer of /api/saldo (the
  organization in the address, the switcher, what each person is in each
  organization, the people and their roles, the phone) is read in a browser
  by e2e/panel.spec.ts and e2e/panel-gente.spec.ts.

  Scenario: The panel and its three screens exist in every locale, each with its own title
    Given the store application has been built
    Then every locale has the panel, its homes, its members, its roles and its balance, each titled in its own words

  Scenario: The rail draws seven built pieces, the Oracle's four rooms and four pieces under construction
    Given the store application has been built
    Then every panel page draws the rail of pieces the same way in every locale

  Scenario: A piece that is not built is never a link, and the Oracle's rooms wait for the Oracle
    Given the store application has been built
    Then no panel page links a piece that is not built
    And the Oracle's rooms stay hidden on every panel page until the session says Oracle

  Scenario: The account menu has the door to the panels between the profile and the settings
    Given the store application has been built
    Then every locale's account menu offers the panels between the profile and the settings, for people who are in

  Scenario: The panel belongs to Perteneces
    Given the store application has been built
    Then the panel pages light Perteneces in the sidebar and in the tab bar

  Scenario: The members and roles screens of the panel are served with the walls of a page where the wallet signs
    Given the store application has been built
    Then the members and roles pages of the panel have the wallet's walls in every locale

  Scenario: Saldo's old «Miembros y roles» address sends to the panel's Miembros in every locale
    Given the store application has been built
    Then every locale's old members page of Saldo sends to its panel's Miembros, with a link, out of the index
    And Saldo's members tab leads to the panel's Miembros in every locale
