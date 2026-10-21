Feature: Communities (phase 0 of the communities platform)
  Every community that already gathers has a public page in the city, with
  its rituals, its place and its links; the house opens the pages, the
  community claims them later. A prepared page (the community has not said
  yes yet) is a file but never a page. The rituals feed the home, the
  calendar and the iCalendar feeds. Since the app shell (v0.83.0) the home
  is action, not explanation: what it used to explain lives in «Cómo
  funciona», which replaced the city page. Since v3 the home is «Ahora», the
  same for everyone. Verified against the build output.

  Scenario: The communities index and the calendar exist in every locale
    Given the store application has been built
    Then the communities index exists under every locale prefix

  Scenario: Public communities have pages, prepared ones do not
    Given the store application has been built
    Then every public community has a page and every prepared one has none

  Scenario: The home shows what is coming and the city feed matches it
    Given the store application has been built
    Then the home lists the upcoming rituals and the city feed is a calendar

  Scenario: The home acts instead of explaining, and does not show the Bazar
    Given the store application has been built
    Then the home carries no explanation heading and opens on the featured card
    And the home does not show the Bazar

  Scenario: The home is «Ahora», the same for everyone, and its questions live in how it works
    Given the store application has been built
    Then the home is «Ahora» in every locale: one face, the featured frame first, then encounters and communities, with the Bazar hidden
    And the questions of the old visitor face are on how it works

  Scenario: The app shell pages exist in every locale
    Given the store application has been built
    Then "how-it-works", "live" and "belong" exist under every locale prefix

  Scenario: The city page is retired to «Cómo funciona»
    Given the store application has been built
    Then every city address redirects to how it works in its own locale

  Scenario: «Me apunto» is real and «Tu agenda» is a person's page, never a static file
    Given the store application has been built
    Then every upcoming encounter page offers «Me apunto» as a toggle and the calendar as a second action
    And the agenda page is rendered on demand under every locale prefix

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

  Scenario: The home's encounters ride a strip, and the Bazar is not on the home
    Given the store application has been built
    Then the home's encounters ride a strip with arrows and the Bazar is not on the home

  Scenario: A community's page shows what its space uses, each piece with its honest state
    Given the store application has been built
    Then every community page lists the five pieces its space uses
    And a home is entered and counted only where it exists, and the rest is marked under construction

  Scenario: On screen they are «encuentros», not «rituales»
    Given the store application has been built
    Then the pages of the communities say «encuentro», never «ritual»

  Scenario: A community lists its people only where its file links an organization, and the built page names no one
    Given the store application has been built
    Then the pages of communities with an organization carry a hidden slot for its people, and the others carry none
