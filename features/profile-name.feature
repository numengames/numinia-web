Feature: «Tu nombre en la ciudad» — a name and a Bazar avatar that fellow members see
  Pablo's decision of 2026-10-16: «¿Guardamos en la web un nombre y un avatar
  que cada uno elija, que solo vean quienes están en la misma organización? —
  ok». The settings page carries the section in every locale at #nombre,
  right after «Sesión», hidden until there is a session (the chrome shows
  it). It says who will see the name before it asks for one, and offers the
  Bazar's own avatars with their baked thumbnails, «no avatar» first and
  chosen: nobody is shown before choosing (STD-053). Verified against the
  build output; what the section does in a browser is e2e/profile-name.spec.ts.

  Scenario: The section is in every locale, right after the session, hidden until signed in
    Given the store application has been built
    Then every locale's settings page has the section «Tu nombre en la ciudad» at #nombre, right after the session's
    And each section says who will see the name before it asks for one, and stays hidden until there is a session

  Scenario: The avatars are the Bazar's own, with their baked thumbnails
    Given the store application has been built
    Then every locale's section offers the Bazar's avatars with their baked thumbnails, no avatar first and chosen
    And every control of the section carries a data-metric
