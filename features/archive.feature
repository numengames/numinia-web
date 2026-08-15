Feature: The CC0 Archive (MISSION-001)
  Every public asset from the validated catalogs becomes a localized static
  page; the index lists them all. Verified against the hermetic build output.

  Scenario: Every public asset gets a detail page in all five locales
    Given the committed multi-catalog fixture
    And the store application has been built
    When I collect the public asset ids
    Then each asset has a detail page under every locale prefix
    And each detail page carries a download control or an unavailable notice

  Scenario: The archive index lists every public asset
    Given the committed multi-catalog fixture
    And the store application has been built
    Then the archive index contains one card per public asset
    And the archive index offers search and format filters
