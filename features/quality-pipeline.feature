Feature: Quality pipeline blocks bad code
  MISSION-000 acceptance: a file containing an "any" type or a "console.log"
  makes the lint gate exit non-zero, reporting the offending file and line.

  Scenario: Lint rejects any and console.log with file and line
    Given a source file containing an "any" type and a "console.log"
    When the lint gate runs on it
    Then the gate exits non-zero
    And the report names the offending file and both line positions
