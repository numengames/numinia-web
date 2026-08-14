Feature: Hermetic data fixture
  The committed catalog snapshot must satisfy the exact same domain schema as
  the network path — offline builds cannot drift from real-data validation.

  Scenario: The fixture snapshot validates against the domain asset schema
    Given the committed avatar catalog fixture
    When it is parsed with the domain asset validator
    Then it yields at least 1 valid asset
    And every asset has a non-empty id and a known format
