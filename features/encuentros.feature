Feature: Encuentros — the city's upcoming encounters as a list by month
  The v3 «Encuentros» room (/calendar/, lane 2): what a person sees first is
  the list of every upcoming encounter of the city, one section per month in
  date order, each row with its day, its name linking to its page, who holds
  it and where; «Mes» swaps the list for the month grid. Only real encounters
  from the register appear, the held ones never. Verified against the built
  pages; the switch in a browser is e2e/encuentros.spec.ts.

  Scenario: Encuentros lists every upcoming encounter by month, in every locale
    Given the store application has been built
    Then the Encuentros page of every locale lists each upcoming encounter once, by month in date order
    And the Encuentros page also carries the month grid and the city feed
