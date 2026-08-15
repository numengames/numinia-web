Feature: SEO plumbing
  Every page declares canonical + hreflang alternates; the sitemap covers the
  archive and excludes internal pages. Verified against the build output.

  Scenario: Localized pages declare canonical and all alternates
    Given the store application has been built
    When I inspect the generated page for locale "es"
    Then the page declares a canonical link
    And it declares hreflang alternates for every locale and x-default

  Scenario: The sitemap covers the archive and hides internals
    Given the store application has been built
    And the committed multi-catalog fixture
    Then the sitemap exists and lists every public asset page
    And the sitemap does not list internal pages

  Scenario: Every indexed section declares a meta description and OG basics
    Given the store application has been built
    Then key pages declare meta description and open graph tags
