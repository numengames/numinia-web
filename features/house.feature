Feature: The house in its sphere (v3 «La esfera y la casa»)
  Numen Games is not one more community: it is the community of communities,
  the metagame. On the communities index it leaves the grid and sits at the
  top right in a sphere with one dot per community on its ring — at most
  twelve, the rest in a «+N» chip. Its own page is a narrative, not a card:
  it tells the three linked rings (PRI-006), the metagame, and closes on the
  epitaph under the Khepri. Verified against the build output, five locales.

  Scenario: The house is not in the grid; it sits in its sphere
    Given the store application has been built
    Then the communities index in every locale draws the house in its sphere and not in the grid

  Scenario: The page of Numen Games tells the three rings
    Given the store application has been built
    Then the page of Numen Games in every locale tells the three rings and the metagame and closes on the epitaph
