Feature: The sign-in door
  Pablo's QA of 2026-10-15: the sign-in must look like TikTok's or Airbnb's
  — «súper limpio, súper sencillito». /lap/session/ is one panel over the
  app, labelled by its title, with a close button first, the way in, and one
  legal line: continuing is accepting (the sign-in-wrap that replaced
  MIS-086's checkbox). The accepted legal version still travels with the
  login, and the endpoint still refuses a stale one. Verified against the
  build output.

  Scenario: The door is a modal panel in every locale, with no checkbox
    Given the store application has been built
    Then every locale's sign-in door is one labelled dialog with a close button first
    And no sign-in door asks for a tick and each links the terms and the privacy policy

  Scenario: The login still carries the accepted legal version
    Given the store application has been built
    Then the sign-in door's script sends the current legal corpus version with the login
