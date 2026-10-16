Feature: Three pillars (MISSION-004)
  The site is organized as La Ciudad, Assets, and LAP — since v3 «La ciudad
  y tú» (v0.112.0) in two mirrored rails: on the left the city (Buscar,
  Ahora, Comunidades, Encuentros, Mundos, Bazar), on the right you (the door
  or your face, Crear, Avisos, Tus comunidades, Tu saldo, Tu botín, the
  settings, the appearance and the language); a phone gets a bottom bar of
  four city places and «Tú». The footer, folded at the city rail's foot,
  names the house's three sites and the legal texts; NWOS, GitHub and
  Discord left it. The sections exist in every locale, and no internal link
  is broken. Verified against the build output.

  Scenario: The app shell carries both rails and the phone's bar on every page
    Given the store application has been built
    Then every page bar carries the scarab, the search, the mode and the door
    And every page city rail, your rail and phone bar carry their places
    And every page footer names the three sister sites and no social links

  Scenario: The pillar sections exist in every locale
    Given the store application has been built
    Then every city address redirects to how it works in its own locale
    And the bazaar and lap pages exist under every locale prefix

  Scenario: No internal link on the site is broken
    Given the store application has been built
    Then the link integrity gate passes

  Scenario: External links always open in a new tab
    Given the store application has been built
    Then every external link opens in a new tab
