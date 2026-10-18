## [0.6.3](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.6.2...v0.6.3) (2026-10-18)


### Bug Fixes

* **infra:** redirect picker prompts to stderr and simplify admin cockpit ([#246](https://github.com/AKTK-Bystrze/Magazyn/issues/246)) ([01bc961](https://github.com/AKTK-Bystrze/Magazyn/commit/01bc961c56e3b0a7aa7e31a5a41d656b155d83be))

## [0.6.1](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.6.0...v0.6.1) (2026-10-16)


### Bug Fixes

* remove empty deleted file from repository ([#242](https://github.com/AKTK-Bystrze/Magazyn/issues/242)) ([db2d800](https://github.com/AKTK-Bystrze/Magazyn/commit/db2d80040fe6c8ede71343bd764894513ffe48ae))

# [0.6.0](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.5.1...v0.6.0) (2026-10-16)


### Bug Fixes

* **ci:** fix PR release preview workflow and move changelog to root ([cf8c9fb](https://github.com/AKTK-Bystrze/Magazyn/commit/cf8c9fbebd8ccc6d4b50419654a1778205211b87))


### Features

* **preview:** test automated release preview workflow ([0cb606e](https://github.com/AKTK-Bystrze/Magazyn/commit/0cb606e6254525d09e6280826b5681ca5c189f00))

## [0.5.1](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.5.0...v0.5.1) (2026-10-16)


### Bug Fixes

* **ci:** fix PR release preview workflow and move changelog to root ([#240](https://github.com/AKTK-Bystrze/Magazyn/issues/240)) ([987d54a](https://github.com/AKTK-Bystrze/Magazyn/commit/987d54ad749d47dc6ddf41591039a5a125e667fe))

# [0.5.0](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.4.2...v0.5.0) (2026-10-14)


### Features

* **reservations:** add search, user, type filters and multi-date sorting ([#230](https://github.com/AKTK-Bystrze/Magazyn/issues/230)) ([#233](https://github.com/AKTK-Bystrze/Magazyn/issues/233)) ([a8f50ab](https://github.com/AKTK-Bystrze/Magazyn/commit/a8f50ab211776a375d76f7d3ba93401487d7bf44))

## [0.4.2](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.4.1...v0.4.2) (2026-10-14)


### Bug Fixes

* **equipment:** fix equipment type filter in admin manager ([#229](https://github.com/AKTK-Bystrze/Magazyn/issues/229)) ([#232](https://github.com/AKTK-Bystrze/Magazyn/issues/232)) ([d738839](https://github.com/AKTK-Bystrze/Magazyn/commit/d738839bc10a01f3c16e863c0cb7aabb860bc198))

## [0.4.1](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.4.0...v0.4.1) (2026-10-14)


### Bug Fixes

* **reservations:** validate status filter and map db enum errors ([#228](https://github.com/AKTK-Bystrze/Magazyn/issues/228)) ([8ffa45b](https://github.com/AKTK-Bystrze/Magazyn/commit/8ffa45b064964923315a0ae4a916968e9d6ea535))

# [0.4.0](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.3.1...v0.4.0) (2026-10-14)


### Features

* **infra:** unified admin cockpit, deployment hardening, and disaster recovery suite ([#227](https://github.com/AKTK-Bystrze/Magazyn/issues/227)) ([2e8b458](https://github.com/AKTK-Bystrze/Magazyn/commit/2e8b458511e092db379247a3bb29c17426ae582f))

## [0.3.1](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.3.0...v0.3.1) (2026-10-14)


### Bug Fixes

* **reservations:** translate cancelled status to Anulowano and align docs ([#226](https://github.com/AKTK-Bystrze/Magazyn/issues/226)) ([12b55f9](https://github.com/AKTK-Bystrze/Magazyn/commit/12b55f9c14555a0f7c7275857f763976ba604277))

# [0.3.0](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.2.1...v0.3.0) (2026-10-14)


### Bug Fixes

* **infra:** use env-configured supabase url and harden deploy script ([#224](https://github.com/AKTK-Bystrze/Magazyn/issues/224)) ([ad6c146](https://github.com/AKTK-Bystrze/Magazyn/commit/ad6c14676a3f0e8ab937dc7db6bc2792e2c51122))


### Features

* **infra:** use journald logging driver for persistent container logs ([#225](https://github.com/AKTK-Bystrze/Magazyn/issues/225)) ([4ea8b96](https://github.com/AKTK-Bystrze/Magazyn/commit/4ea8b96b2ea5c9c49be8ad0f73d518d541582a16))

## [0.2.1](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.2.0...v0.2.1) (2026-10-14)


### Bug Fixes

* **infra:** update caddy healthcheck to query internal metrics endpoint ([#223](https://github.com/AKTK-Bystrze/Magazyn/issues/223)) ([58923cc](https://github.com/AKTK-Bystrze/Magazyn/commit/58923ccb061f66fc8648a397148eae0fc250695b))

# [0.2.0](https://github.com/AKTK-Bystrze/Magazyn/compare/v0.1.0...v0.2.0) (2026-10-13)


### Bug Fixes

* address integration review issues ([8d67c4b](https://github.com/AKTK-Bystrze/Magazyn/commit/8d67c4baf6472c7fc3a77b9a5fbb5d94ab840a51))
* don't send link if there is no user ([#148](https://github.com/AKTK-Bystrze/Magazyn/issues/148)) ([c389462](https://github.com/AKTK-Bystrze/Magazyn/commit/c389462239dae7d90b169c97bb97c4d214a520e1))
* don't truncate equipment names + show 'details' button on mobile ([#144](https://github.com/AKTK-Bystrze/Magazyn/issues/144)) ([7abaa09](https://github.com/AKTK-Bystrze/Magazyn/commit/7abaa09755200e9deb0a0df30d2118a2fe247768))
* **e2e:** add missing data-testids to ReservationTable ([8e48360](https://github.com/AKTK-Bystrze/Magazyn/commit/8e48360c96f0c461c5b989e3722cc9550cdf154e))
* **e2e:** fix strict mode violations in reservation management test ([7a3bf86](https://github.com/AKTK-Bystrze/Magazyn/commit/7a3bf86c8c1342f291ce45320d67c86bab72b660))
* **e2e:** force click table view toggle on mobile and update group tile border ([6495114](https://github.com/AKTK-Bystrze/Magazyn/commit/6495114c94f4fe183a3b55b7c1b43500a497e130))
* **equipment:** remove maintenance log readOnly state and drop trigger ([#177](https://github.com/AKTK-Bystrze/Magazyn/issues/177)) ([756eeb8](https://github.com/AKTK-Bystrze/Magazyn/commit/756eeb8eb846655340766f7ad3a2ba2f195fb405))
* fix free reservation cancellation ([6eb24e5](https://github.com/AKTK-Bystrze/Magazyn/commit/6eb24e51c015c7f7a6045a2c119de3795d7f6a93))
* **frontend:** astro bff proxy routes, transformer bug, and db types alignment ([77a3b40](https://github.com/AKTK-Bystrze/Magazyn/commit/77a3b4028abc5a272f9025df62c19a45246304ae))
* **frontend:** overlapping detials button ([#168](https://github.com/AKTK-Bystrze/Magazyn/issues/168)) ([2809c82](https://github.com/AKTK-Bystrze/Magazyn/commit/2809c824ea6a203e2aacb1a5eb119b1b7fb922c8))
* paging on user management tab ([#143](https://github.com/AKTK-Bystrze/Magazyn/issues/143)) ([b88a58a](https://github.com/AKTK-Bystrze/Magazyn/commit/b88a58ad5f87665650cacdfea00b0f3fe3c2c720))
* redirect issues in FE blocking page load ([#149](https://github.com/AKTK-Bystrze/Magazyn/issues/149)) ([c6c27f2](https://github.com/AKTK-Bystrze/Magazyn/commit/c6c27f28b964ccc391b913c437b95686e1cfb3a2))
* remove BOM and UTF-16 encoding from migration ([4c71bfd](https://github.com/AKTK-Bystrze/Magazyn/commit/4c71bfdd792875b8bd03e55711f50d9015330bfa))
* Reservation cart validation and desktop sidebar toggle ([#178](https://github.com/AKTK-Bystrze/Magazyn/issues/178)) ([9cbc035](https://github.com/AKTK-Bystrze/Magazyn/commit/9cbc035abd3ad45c6c5f3580b0a4f54c5170e85f))
* **reservation:** calculate partial refunds on early returns ([#180](https://github.com/AKTK-Bystrze/Magazyn/issues/180)) ([e747986](https://github.com/AKTK-Bystrze/Magazyn/commit/e747986ee10673ab84ab3394101632e244731f95))
* resolve literal newlines in API proxy routes ([54cbc8f](https://github.com/AKTK-Bystrze/Magazyn/commit/54cbc8f110f1301dec29f8a35e9b4ea557a5016f))
* robust SSR cookie clearing and update e2e auth tests ([#200](https://github.com/AKTK-Bystrze/Magazyn/issues/200)) ([8be779b](https://github.com/AKTK-Bystrze/Magazyn/commit/8be779b6e5ed8a79abea047f4c98bc267339db26))
* UI date picker, cancel button, layout ([#175](https://github.com/AKTK-Bystrze/Magazyn/issues/175)) ([87164d0](https://github.com/AKTK-Bystrze/Magazyn/commit/87164d0750647842b21cc8c9d801a069ad93dc18))


### Features

* add equipment view mode layouts (grid/list) ([#183](https://github.com/AKTK-Bystrze/Magazyn/issues/183)) ([#199](https://github.com/AKTK-Bystrze/Magazyn/issues/199)) ([936726e](https://github.com/AKTK-Bystrze/Magazyn/commit/936726e843f5ad45b3268ac6cd753077d38610fd))
* add reverse proxy transport timeouts in Caddy ([#153](https://github.com/AKTK-Bystrze/Magazyn/issues/153)) ([acbdd94](https://github.com/AKTK-Bystrze/Magazyn/commit/acbdd9488b108c75b4706b4f748f329353b70fd4))
* add sorting and filtering to tables ([#183](https://github.com/AKTK-Bystrze/Magazyn/issues/183)) ([#194](https://github.com/AKTK-Bystrze/Magazyn/issues/194)) ([dfb9069](https://github.com/AKTK-Bystrze/Magazyn/commit/dfb9069f34dd04ebebb536647c7adbac0ebb8888))
* admin created free rentals ([#150](https://github.com/AKTK-Bystrze/Magazyn/issues/150)) ([369a34b](https://github.com/AKTK-Bystrze/Magazyn/commit/369a34b45e37bec4763afabb6ef1bd3662f757b9))
* align summary labels and values ([#183](https://github.com/AKTK-Bystrze/Magazyn/issues/183)) ([#196](https://github.com/AKTK-Bystrze/Magazyn/issues/196)) ([458e409](https://github.com/AKTK-Bystrze/Magazyn/commit/458e4095001c28ad4f0d4e24f395a8be44f7ec1f))
* credits requesting ([#189](https://github.com/AKTK-Bystrze/Magazyn/issues/189)) ([e31a5e5](https://github.com/AKTK-Bystrze/Magazyn/commit/e31a5e5287ada7391bc979095bd3a388b940b11e))
* **credits:** Architectural Fixes & Code Cleanup ([#192](https://github.com/AKTK-Bystrze/Magazyn/issues/192)) ([12dda85](https://github.com/AKTK-Bystrze/Magazyn/commit/12dda8586cfbd6bc271b447b1fbb5ba08bdf077e))
* DB snapshot mechanism ([#136](https://github.com/AKTK-Bystrze/Magazyn/issues/136)) ([25c5a38](https://github.com/AKTK-Bystrze/Magazyn/commit/25c5a381bd7d20957d362ece54a4264c6f0ac21f))
* free rentals ([#152](https://github.com/AKTK-Bystrze/Magazyn/issues/152)) ([14eef89](https://github.com/AKTK-Bystrze/Magazyn/commit/14eef89caf19d3a936aef53dad7a7e4cf109bfd7))
* implement infinite scroll for lists ([#183](https://github.com/AKTK-Bystrze/Magazyn/issues/183)) ([#198](https://github.com/AKTK-Bystrze/Magazyn/issues/198)) ([e34d88d](https://github.com/AKTK-Bystrze/Magazyn/commit/e34d88d0c51b4cda5575677d047d1ad380149f9e))
* implement reservation creation filters and rename terminology ([#183](https://github.com/AKTK-Bystrze/Magazyn/issues/183)) ([#197](https://github.com/AKTK-Bystrze/Magazyn/issues/197)) ([950b94b](https://github.com/AKTK-Bystrze/Magazyn/commit/950b94bcdb5a7dfbff82dc2a8183bb11794b4f0a))
* **infra:** implement time-based backup rotation and log limits ([#179](https://github.com/AKTK-Bystrze/Magazyn/issues/179)) ([186ebf5](https://github.com/AKTK-Bystrze/Magazyn/commit/186ebf57b75dcbe4e06a562a73e2280715967f8f))
* Mikrus 2 ([#133](https://github.com/AKTK-Bystrze/Magazyn/issues/133)) ([2f62c0f](https://github.com/AKTK-Bystrze/Magazyn/commit/2f62c0fe19d2f897956afad6d58831d1c045a9d3))
* observability and E2E fixes ([#166](https://github.com/AKTK-Bystrze/Magazyn/issues/166)) ([54ae363](https://github.com/AKTK-Bystrze/Magazyn/commit/54ae3631ecc16419e4aeecb1719c157cf4037063))
* **reservations:** add column sorting to table view and update PENDING status color ([da97c55](https://github.com/AKTK-Bystrze/Magazyn/commit/da97c55ecedcc0b2bdadb0918d0acd08349afce8))
* Reusable FilterSidebar for Equipment Manager (Issue [#125](https://github.com/AKTK-Bystrze/Magazyn/issues/125)) ([#182](https://github.com/AKTK-Bystrze/Magazyn/issues/182)) ([6d3e25e](https://github.com/AKTK-Bystrze/Magazyn/commit/6d3e25ea5623af254e0b3cde0facfa616638231d))
* update grouped reservation template and color styling ([#183](https://github.com/AKTK-Bystrze/Magazyn/issues/183)) ([#195](https://github.com/AKTK-Bystrze/Magazyn/issues/195)) ([8922a1c](https://github.com/AKTK-Bystrze/Magazyn/commit/8922a1cd0fbda01f3691f85ebbad74ed4a1ff589))
* update table view for mobile and rename status ([da23f61](https://github.com/AKTK-Bystrze/Magazyn/commit/da23f61f152f8c982cccf344fdf66b249fc0b693))
* updated grouped reservation template and color ([#183](https://github.com/AKTK-Bystrze/Magazyn/issues/183)) ([8099a3e](https://github.com/AKTK-Bystrze/Magazyn/commit/8099a3e4895d6943ec961ec06a36c1b1c24911cc))
* use tiles view as default ([e10c366](https://github.com/AKTK-Bystrze/Magazyn/commit/e10c366d29b1756b09243efc18faa9d2616c4469))


### Reverts

* chore(deps): update frontend and backend dependencies ([25d3241](https://github.com/AKTK-Bystrze/Magazyn/commit/25d3241a2142fae0a1801df0c45e1e7b4d323ad2))
* restore frontend documentation to main state ([b1915da](https://github.com/AKTK-Bystrze/Magazyn/commit/b1915dac24a859cd5d0e45a0539067d280ee075d))
