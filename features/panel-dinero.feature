Feature: The money of the panel
  Pablo, 2026-10-16, about his prototype: «hacer todas las partes que nos
  faltan … el control de gastos». Saldo y consumo is one screen — for your
  own account at /saldo/ and for each organization at /panel/saldo/ — with
  three cards (the balance and how long it lasts, this month, the low-balance
  warning), the days stacked running over stopped with a table of worlds, the
  movements with the balance after each line and their CSV made in the
  browser, and the rules in sight; the panel's Resumen has four cards and «Lo
  último». Verified against the build output, in the five locales; what the
  screens do with each answer of /api/saldo is read in a browser by
  e2e/panel-dinero.spec.ts and e2e/saldo.spec.ts.

  Scenario: Saldo y consumo speaks its new sections in every locale, for you and for each organization
    Given the store application has been built
    Then every Saldo page and every panel Saldo page carries the words of its cards, its chart, its movements and its rules

  Scenario: No page of the money speaks of an event mode the ledger does not have
    Given the store application has been built
    Then no Saldo page, panel Saldo page or panel Resumen speaks of an event mode

  Scenario: The figures are painted only for a session
    Given the store application has been built
    Then no Saldo page, panel Saldo page or panel Resumen carries a card of figures in its built HTML

  Scenario: The Resumen is handed the next encounters of each organization when the site is built
    Given the store application has been built
    Then every panel Resumen carries the words of its four cards and of «Lo último»
    And every panel Resumen hands its island encounters that are built pages of its own locale

  Scenario: The CSV of the movements is made in the browser
    Given the store application has been built
    Then the site has no endpoint that makes a CSV of the movements
