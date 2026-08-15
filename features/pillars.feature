Feature: Three pillars (MISSION-004)
  The site is organized as La Ciudad, Assets, and L.A.P. — the header shows
  exactly those three doors, the new sections exist in every locale, and no
  internal link is broken. Verified against the build output.

  Scenario: The header shows the three pillars on every page
    Given the store application has been built
    Then every page header links city, assets, and lap

  Scenario: The pillar sections exist in every locale
    Given the store application has been built
    Then the city pages exist under every locale prefix
    And the assets hub and lap pages exist under every locale prefix

  Scenario: No internal link on the site is broken
    Given the store application has been built
    Then the link integrity gate passes

  Scenario: External links always open in a new tab
    Given the store application has been built
    Then every external link opens in a new tab
