Feature: Updates timeline and legal pages (MISSION-003 P3)
  The platform history from v0.1.0 onward, and the four legal pages —
  drafts that must announce themselves as such until the Oracle approves
  the wording. Verified against the build output.

  Scenario: The updates timeline lists the whole version history
    Given the store application has been built
    Then the updates page exists under every locale prefix
    And the updates page lists every version from "1" to "15"
    And the updates page lists version "v0.16.0" and "v0.18.0"

  Scenario: Legal pages exist and declare their draft status
    Given the store application has been built
    Then every legal page exists under every locale prefix
    And every legal page carries the draft banner

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
