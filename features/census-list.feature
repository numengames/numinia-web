Feature: «Quién ha entrado» — everyone who has signed in, for the house to add to an organization
  Pablo's decision of 2026-10-16: «tengo que poder añadir a gente que haya
  pasado por la plataforma. O sea, los que se hayan logado yo tengo que poder
  verlos en el censo». The Census page carries, above the one-wallet lookup
  of ranks, a list of everyone who has signed in, in every locale, hidden
  until the session is an Oracle's (the chrome shows it): only the house
  sees who it is (STD-053). It says plainly that people who signed in before
  the list existed appear once they sign in again. Verified against the build
  output; what the list does in a browser is e2e/census-list.spec.ts.

  Scenario: The list is on every locale's Census page, for the house only
    Given the store application has been built
    Then every locale's Census page has the list «Quién ha entrado» above the lookup, hidden until an Oracle signs in
    And each list says in one sentence that people who signed in before today appear once they sign in again
    And every control of the list carries a registered data-metric
