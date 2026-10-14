Feature: Three pillars (MISSION-004)
  The site is organized as La Ciudad, Assets, and LAP — since the app shell
  (the Oracle's design, 2026-10-14, v0.83.0) the places live in a sidebar,
  a tab bar on a phone: Para ti, Explorar (Comunidades, Calendario, Bazar),
  Perteneces, Live and Perfil, then «Más». The top bar carries no menu:
  the door and ⋮ (the mode, the language, the settings). The footer, folded
  at the sidebar's foot, names the house's three sites and the legal texts;
  NWOS, GitHub and Discord left it. The sections exist in every locale, and
  no internal link is broken. Verified against the build output.

  Scenario: The app shell carries the places, the door and ⋮ on every page, no menu
    Given the store application has been built
    Then every page bar carries the scarab, the search, the mode and the door
    And every page sidebar and tab bar carry the five places
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
