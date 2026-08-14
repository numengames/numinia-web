Feature: Internationalized routing
  MISSION-000 acceptance: the store serves five locales, each with its own
  <html lang> attribute. Verified against the SSG build output.

  Scenario Outline: Locale page is generated with its own language attribute
    Given the store application has been built
    When I inspect the generated page for locale "<locale>"
    Then the page exists
    And its html lang attribute is "<locale>"

    Examples:
      | locale |
      | en     |
      | es     |
      | ja     |
      | ko     |
      | pt-br  |
