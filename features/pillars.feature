Feature: Three pillars (MISSION-004)
  The site is organized as La Ciudad, Assets, and LAP — since the
  communities platform (2026-10-14) the bar carries no menu: the scarab,
  the search, the mode, the language and the door; the footer links the
  three sections, the communities and the calendar. The sections exist in
  every locale, and no internal link is broken. Verified against the build
  output.

  Scenario: The bar shows the scarab and the utilities on every page, no menu
    Given the store application has been built
    Then every page bar carries the scarab, the search, the mode and the door
    And every page footer links city, assets, lap, communities and the calendar

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
