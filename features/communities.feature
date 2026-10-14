Feature: Communities (phase 0 of the communities platform)
  Every community that already gathers has a public page in the city, with
  its rituals, its place and its links; the house opens the pages, the
  community claims them later. A prepared page (the community has not said
  yes yet) is a file but never a page. The rituals feed the home, the
  calendar and the iCalendar feeds. Verified against the build output.

  Scenario: The communities index and the calendar exist in every locale
    Given the store application has been built
    Then the communities index exists under every locale prefix

  Scenario: Public communities have pages, prepared ones do not
    Given the store application has been built
    Then every public community has a page and every prepared one has none

  Scenario: The home shows what is coming and the city feed matches it
    Given the store application has been built
    Then the home lists the upcoming rituals and the city feed is a calendar
