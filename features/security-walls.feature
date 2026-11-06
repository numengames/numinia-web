Feature: The security walls of numinia.com
  The Content-Security-Policy of the site is written twice: public/_headers
  for the static layer (the assets layer answers before the Worker) and
  CSP_STRICT / CSP_SESSION in src/middleware.ts for the pages the Worker
  answers. Nothing tied the two together, and nothing said which pages may
  talk to hosts outside the site. These scenarios read both files and hold
  the properties that were closed on 2026-10-18 (MISSION-025): the strict
  policy cannot reach an external host with fetch, the two copies cannot
  drift apart, and only the pages where a wallet signs relax that rule.
  The policy still allows inline scripts and styles; SECURITY.md says so,
  and a scenario keeps that note true in both directions.

  Scenario: The strict policy is the same text on the static layer and on the pages the Worker answers
    Given the source of the security walls
    Then the global policy in _headers and the strict policy in the middleware are the same text

  Scenario: The strict policy keeps fetch closed to every host but the site
    Given the source of the security walls
    Then the strict policy lets connect-src reach only the site and blob

  Scenario: The directives that make the inline allowance tolerable stay up
    Given the source of the security walls
    Then the strict policy keeps default-src, object-src, base-uri, form-action and frame-ancestors closed

  Scenario: Only the pages where a wallet signs may reach outside hosts
    Given the source of the security walls
    Then every rule of _headers that opens connect-src belongs to a page the middleware treats as a session page
    And every session page in every locale has its rule, detaching the global policy before relaxing it
    And the session policy of the middleware is the strict one with only connect-src and frame-src opened

  Scenario: SECURITY.md names the inline allowance for as long as the policy has it
    Given the source of the security walls
    Then SECURITY.md has a residual-risk note for each of script-src and style-src that the strict policy still allows inline, and for no other
