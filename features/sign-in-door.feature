Feature: The sign-in door
  Pablo's QA of 2026-10-15: the sign-in must look like TikTok's or Airbnb's
  — «súper limpio, súper sencillito». /lap/session/ is one panel over the
  app, labelled by its title, with a close button first, the way in, and one
  legal line: continuing is accepting (the sign-in-wrap that replaced
  MIS-086's checkbox). Verified against the build output. That the login
  still carries the accepted legal version is read in the built island by
  e2e/sign-in-door.spec.ts: this suite's build has no thirdweb client id, so
  the widget's code is not in it; the endpoint's refusal of a stale version
  is lib/__tests__/login-gate.test.ts.

  Scenario: The door is a modal panel in every locale, with no checkbox
    Given the store application has been built
    Then every locale's sign-in door is one labelled dialog with a close button first
    And no sign-in door asks for a tick and each links the terms and the privacy policy
