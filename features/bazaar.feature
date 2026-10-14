Feature: The Bazaar, and the doors that went out (v0.83.0)
  One way to navigate the city's digital goods: the Finder rethought —
  filters, cards, a preview and a download queue that leaves as one zip.
  One React island, data inlined at build. The five old doors (the Assets
  page, the Gallery, the Archive's index, the Finder, the Inspector) lead
  to it; the docs lead to numinia.org; the object pages stay and lead back
  to it. Verified against the build output; interaction, the zip and the
  301s themselves are covered by the Playwright suite (e2e/bazaar.spec.ts).

  Scenario: The Bazaar exists in every locale as a hydrated island
    Given the store application has been built
    And the committed multi-catalog fixture
    Then the bazaar page exists under every locale prefix with its own name
    And each bazaar page mounts exactly one island
    And the bazaar island data covers every public asset
    And the bazaar keeps the licence in sight

  Scenario: The retired doors lead to the Bazaar, the docs to numinia.org
    Given the store application has been built
    Then every retired door leads to the bazaar of its locale
    And every docs page leads to numinia.org

  Scenario: Every public asset keeps its page in all five locales
    Given the committed multi-catalog fixture
    And the store application has been built
    When I collect the public asset ids
    Then each asset has a detail page under every locale prefix
    And each detail page carries a download control or an unavailable notice
    And each detail page leads back to the bazaar of its locale
