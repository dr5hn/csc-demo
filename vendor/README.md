# Dependency provenance

Verified on 2026-10-29. This is a static site without a package manifest,
lockfile, or build step. Preserve upstream distribution files and license
headers when updating them.

## Versions and sources

| Dependency | Version | Source |
| --- | --- | --- |
| jQuery | 3.7.1 | [npm package](https://registry.npmjs.org/jquery/3.7.1), `package/dist/jquery.min.js` |
| Bootstrap | 4.6.2 | [npm package](https://registry.npmjs.org/bootstrap/4.6.2), `package/dist/css/bootstrap.min.css` and `package/dist/js/bootstrap.bundle.min.js` |
| Popper.js, inside Bootstrap's bundle | 1.16.1 | Bootstrap 4.6.2's source map identifies `node_modules/popper.js/dist/esm/popper.js` as 1.16.1 |
| Dynatable | 0.3.1 | [latest upstream tag](https://github.com/alfajango/jquery-dynatable/tree/v0.3.1), commit `dd1a0361d6e75c9edd88db07bbb4d8688a665b49`; both files match exactly |
| Tailwind Play CDN | 3.4.17 | [versioned browser compiler](https://cdn.tailwindcss.com/3.4.17), loaded by `index.html` |
| Country flag emoji polyfill | 0.1.10 | [npm package](https://registry.npmjs.org/country-flag-emoji-polyfill/0.1.10); `index.html` loads its exact-version jsDelivr module and font |
| Cache API polyfill, `../js/cache-polyfill.js` | Unversioned | Matches [upstream `index.js`](https://github.com/dominiccooney/cache-polyfill/blob/2f59f7581d1ce127af6631fad0ef33b77dd6e8ff/index.js) ignoring whitespace; upstream has no release tags and calls it [obsolete](https://github.com/dominiccooney/cache-polyfill#readme) |

The current page does not load jQuery, Bootstrap, or Dynatable; the dormant
service worker still lists their paths. Its registration is unchanged.
Google's managed `gtag.js` endpoint and upstream geography JSON are services/data,
not independently versioned library releases.

## Integrity

Download the tarball URL from the linked npm metadata, calculate its SHA-512,
and compare its base64 digest with `dist.integrity` **before** extracting files.
The following archives passed that check:

| npm archive | Verified `dist.integrity` |
| --- | --- |
| `jquery-3.7.1.tgz` | `sha512-m4avr8yL8kmFN8psrbFFFmB/If14iN5o9nw/NgnnM+kybDJpRsAynV2BsfpTYrTRysYUdADVD7CkUUizgkpLfg==` |
| `bootstrap-4.6.2.tgz` | `sha512-51Bbp/Uxr9aTuy6ca/8FbFloBUJZLHwnhTcnjIeRn2suQWsWzcuJhGjKDB5eppVte/8oCdOL3VuwxvZDUggwGQ==` |
| `country-flag-emoji-polyfill-0.1.10.tgz` | `sha512-5O50p2mq/d8+4AfHz3monRQaBA4TIQ0XcKqJUhCYR6SMsLqlO4m8f87og6R1D68Z1sNXGkjLkcEccuzC6T9i5g==` |

The updated vendor files are byte-for-byte copies of those archives. The
jsDelivr module and font also match their npm archive bytes. SHA-256 digests:

| File or URL path | SHA-256 |
| --- | --- |
| `jquery/jquery.min.js` | `fc9a93dd241f6b045cbff0481cf4e1901becd0e12fb45166a8f17f95823f0b1a` |
| `bootstrap/css/bootstrap.min.css` | `f886516f3d41e9e7bd994c7f7a39a89cafae9483f90396cb0ddeafe8d1ea5e72` |
| `bootstrap/js/bootstrap.bundle.min.js` | `19126b874a32753d42c12dfa6c17892bfd93820a5a5100ba1b34da4d07599b49` |
| `dynatable/js/jquery.dynatable.js` | `afb5b09cb445af83632702130a61d0a439f79aea416c357c59e31fd427004d1c` |
| `dynatable/css/jquery.dynatable.css` | `fb16137621374265c0342670b7d6b850de98484c801a51a30dfd2bcf2983d6cf` |
| `cdn.tailwindcss.com/3.4.17` | `176e894661aa9cdc9a5cba6c720044cbbf7b8bd80d1c9a142a7c24b1b6c50d15` |
| `country-flag-emoji-polyfill@0.1.10/dist/index.mjs` | `88ff05e4e5e28015ee90f7f7a9f01d545618247a458798e4286a16d94b74c368` |
| `country-flag-emoji-polyfill@0.1.10/dist/TwemojiCountryFlags.woff2` | `9f04f14429bb6a9f415c7a4dd902a918d7e81a4f7526c415496fdb063954e3b8` |

## Deferred upgrades

- **jQuery 4.0.0:** Bootstrap 4.6.2 requires jQuery `1.9.1 - 3`.
  Dynatable uses `$.trim` and `$.isArray`, both removed by the
  [jQuery 4 upgrade](https://jquery.com/upgrade-guide/4.0/#breaking-change-deprecated-apis-removed).
- **Bootstrap 5.3.8 / Popper 2.11.8 (`@popperjs/core`):** retain the current
  vendor major. The [migration guide](https://getbootstrap.com/docs/5.3/migration/#v500)
  describes changed styles, plugin data attributes, and the Popper 2 migration;
  this update has no browser validation for that migration. Bootstrap 4 is
  [unsupported](https://blog.getbootstrap.com/2022/07/19/bootstrap-4-6-2/).
- **Tailwind 3.4.19:** npm's latest v3 is unavailable from the existing Play CDN:
  [the endpoint](https://cdn.tailwindcss.com/3.4.19) returns HTTP 200 containing
  `console.error("Unknown Tailwind version: ...")`, rather than a compiler.
  Keep the available 3.4.17 compiler; moving to a build pipeline is deferred.
- **Tailwind 4.3.3:** the page uses `shadow-sm` and
  `focus:outline-none`, which change in the [v4 upgrade](https://tailwindcss.com/docs/upgrade-guide).
  A migration requires a human visual check and review of its newer browser requirements.
- **Dynatable:** unmaintained, already at the latest tagged release (0.3.1,
  January 2014). Keep it in this update. [DataTables](https://datatables.net/)
  is an option for a separately scoped replacement. The npm package named
  `dynatable` belongs to a different repository and is not this upstream release.

Browser and visual checks were unavailable in the dependency update sandbox.
