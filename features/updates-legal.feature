Feature: Updates timeline and legal pages (MISSION-003 P3)
  The platform history from v0.1.0 onward, and the four legal pages —
  drafts that must announce themselves as such until the Oracle approves
  the wording. Verified against the build output.

  Scenario: The updates timeline lists the whole version history
    Given the store application has been built
    Then the updates page exists under every locale prefix
    And the updates page lists every version from "1" to "15"
    And the updates page lists version "v0.16.0" and "v0.17.0"

  Scenario: Legal pages exist and declare their draft status
    Given the store application has been built
    Then every legal page exists under every locale prefix
    And every legal page carries the draft banner
