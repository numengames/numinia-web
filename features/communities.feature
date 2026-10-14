Feature: Communities (phase 0 of the communities platform)
  Every community that already gathers has a public page in the city, with
  its rituals, its place and its links; the house opens the pages, the
  community claims them later. A prepared page (the community has not said
  yes yet) is a file but never a page. The rituals feed the home, the
  calendar and the iCalendar feeds. Since the app shell (v0.83.0) the home
  is action, not explanation: what it used to explain lives in «Cómo
  funciona», which replaced the city page. Verified against the build output.

  Scenario: The communities index and the calendar exist in every locale
    Given the store application has been built
    Then the communities index exists under every locale prefix

  Scenario: Public communities have pages, prepared ones do not
    Given the store application has been built
    Then every public community has a page and every prepared one has none

  Scenario: The home shows what is coming and the city feed matches it
    Given the store application has been built
    Then the home lists the upcoming rituals and the city feed is a calendar

  Scenario: The home acts instead of explaining, and shows the Bazar
    Given the store application has been built
    Then the home carries no explanation heading and opens on the featured card
    And the home shows the Bazar block with real goods and their licence

  Scenario: The app shell pages exist in every locale
    Given the store application has been built
    Then "how-it-works", "live" and "belong" exist under every locale prefix

  Scenario: The city page is retired to «Cómo funciona»
    Given the store application has been built
    Then every city address redirects to how it works in its own locale

  Scenario: A community page lets you follow it, and a ritual page puts its world first
    Given the store application has been built
    Then every community page carries the follow button
    And a ritual page opens on its world stage

  Scenario: A community can have its own 3D home, and Live shows the open ones
    Given the store application has been built
    Then a community with a home opens it and counts who is inside
    And Live lists the open homes with their doors

  Scenario: The Oracle edits the register from the site
    Given the store application has been built
    Then the Oracle alone sees how to edit a community and its rituals
