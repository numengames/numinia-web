Feature: Collection Finder (MISSION-003 P2)
  The three-pane explorer: collections, files, preview, and a batch download
  queue. One React island, data inlined at build. Verified against the build
  output; interaction is covered by the Playwright suite.

  Scenario: The finder exists in every locale as a hydrated island
    Given the store application has been built
    And the committed multi-catalog fixture
    Then the finder page exists under every locale prefix
    And each finder page mounts exactly one island
    And the finder island data covers every public asset
