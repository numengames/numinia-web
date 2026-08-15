Feature: Avatar gallery (MISSION-003 P1)
  The visual, avatar-first storefront: every public avatar as a card grouped
  by collection, linking into the Archive detail pages. Zero JS islands.
  Verified against the build output.

  Scenario: The gallery exists in every locale and shows every public avatar
    Given the store application has been built
    And the committed multi-catalog fixture
    Then the gallery page exists under every locale prefix
    And each gallery page shows a card for every public avatar
    And every gallery card links to its archive detail page

  Scenario: Gallery cards are instrumented and static
    Given the store application has been built
    Then every gallery card carries the "gallery-card" metric
    And the gallery page ships no JS islands
