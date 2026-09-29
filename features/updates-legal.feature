Feature: Updates timeline and legal pages (MISSION-003 P3)
  The platform history from v0.1.0 onward, and the four legal pages: each
  one carries its numinia-archive master (LEG-001 to LEG-004) verbatim,
  without the review machinery of the frontmatter. Verified against the
  build output.

  Scenario: The updates timeline lists the whole version history
    Given the store application has been built
    Then the updates page exists under every locale prefix
    And the updates page lists every version from "1" to "15"
    And the updates page lists version "v0.16.0" and "v0.27.0"

  Scenario: The four legal pages exist in every locale
    Given the store application has been built
    Then every legal page exists under every locale prefix
    And the legal notice is also reachable at its short address

  Scenario: The real legal corpus is published
    Given the store application has been built
    Then the legal pages render the corpus without draft or review markers
    And the legal pages carry no scope note
    And the legal pages disclose the language they are written in

  Scenario: Every page links the legal texts and the cookie choice
    Given the store application has been built
    Then every sampled page footer links the four legal texts and the cookie choice
    And every sampled page loads the cookie notice
    And the Codex links the four legal texts and the cookie choice

  Scenario: The footer advertises the current version linking to the timeline
    Given the store application has been built
    Then every page footer shows the current version linking to the updates page
    And the updates page shows the incoming roadmap

  Scenario: The resources docs render with sidebar and legacy notices
    Given the store application has been built
    Then the docs index exists under every locale prefix
    And the docs section renders "11" pages per locale
    And legacy-architecture docs carry the legacy banner

  Scenario: The 3D inspector is available in every locale
    Given the store application has been built
    Then the inspector page exists under every locale prefix as an island
