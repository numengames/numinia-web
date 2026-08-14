Feature: Environment validation fails fast
  MISSION-000 acceptance: a missing required environment variable crashes the
  application at boot with a Zod error naming the variable — the server never
  starts. Fail closed (legacy audit rule 4).

  Scenario: Missing required variable crashes boot naming the variable
    Given an environment without "GITHUB_REPO_OWNER"
    When the environment is validated at boot
    Then validation crashes
    And the error names "GITHUB_REPO_OWNER"

  Scenario: A complete environment boots
    Given a complete required environment
    When the environment is validated at boot
    Then validation succeeds
