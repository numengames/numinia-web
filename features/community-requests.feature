Feature: «Hazla tuya» for real — a person claims a community or asks to enter it
  Cut G (2026-10-17). The beta's measure is the claim rate, so the strip under
  a community's card does something now: signed in, «Es mi comunidad» opens
  a small dialog with one optional line and records a claim; once somebody
  runs the community, «Quiero entrar» records a join; signed out, the button
  leads to sign in and back as before. The house or an administrator decides
  in «Peticiones» — the panel's Members, the house's Census. Verified against
  the build output; what it does in a browser is e2e/community-requests.spec.ts.

  Scenario: The strip and its dialog are on every locale's community page, the house's page excepted
    Given the store application has been built
    Then every locale's page of "merge" carries the claim strip with the sign-in button, the two asks and the dialog with one optional line of 280
    And the house's page "numen-games" carries no claim strip
    And every control of the strip carries a registered data-metric

  Scenario: The Census carries «Peticiones» for the house, in every locale
    Given the store application has been built
    Then every locale's Census page has a «Peticiones» section hidden until an Oracle signs in
