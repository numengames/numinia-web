Feature: The house enters
  Pablo's QA of 2026-10-15: an Oracle could not find the organizations of
  other people anywhere — the till listed only the ones a wallet belongs to,
  so the strip «Entras como la casa» could never appear. During the alpha the
  house is the Oracles (STD-051 ORG-007): an Oracle's session lists and enters
  every organization, as the house, and the till writes down what it does;
  nobody else can. Verified against the built server — started on a free port
  with throwaway secrets, answered by the fixture desk — asked over HTTP with
  sessions signed by that secret. The flag is the server's: it is read from
  the rank in the session's signed cookie, never from anything the browser
  sends. The screens (Members and Balance) are read in a browser by
  e2e/house.spec.ts.

  Scenario: An Oracle lists every organization, the ones it is not in marked as the house's
    Given the built store is running with a wallet on the Oracle list
    When the Oracle asks for its accounts
    Then the answer shows "Numen Games" as its own
    And the answer shows "Active Inference Institute" and "La Tarugo" as the house's

  Scenario: Entering an organization it is not in is entering as the house
    Given the built store is running with a wallet on the Oracle list
    When the Oracle opens the roles of "La Tarugo"
    Then the till answers that it acts as the house

  Scenario: Nobody else enters as the house
    Given the built store is running with a wallet on the Oracle list
    When a citizen asks for its accounts
    Then the answer shows "Numen Games" as its own
    And the answer shows no organization as the house's
    When the citizen opens the roles of "La Tarugo"
    Then the till refuses with "not a member"

  Scenario: A browser cannot say it is the house
    Given the built store is running with a wallet on the Oracle list
    When the citizen asks for the roles of "La Tarugo" claiming to be the house in the query
    Then the till refuses with "not a member"
    When the citizen sends a rename of "La Tarugo" claiming to be the house in the body
    Then the request is refused before the till sees it
