## [1.31.2](https://github.com/DiscordHotline/application-plugin/compare/v1.31.1...v1.31.2) (2019-06-24)


### Bug Fixes

* **discussion:** Fixed invite link in embed ([bbbc43b](https://github.com/DiscordHotline/application-plugin/commit/bbbc43b))

## [1.31.1](https://github.com/DiscordHotline/application-plugin/compare/v1.31.0...v1.31.1) (2019-06-22)


### Bug Fixes

* **vote:** Skip vote message if application denied ([c52c714](https://github.com/DiscordHotline/application-plugin/commit/c52c714))

# [1.31.0](https://github.com/DiscordHotline/application-plugin/compare/v1.30.1...v1.31.0) (2019-06-22)


### Features

* **secrets:** Moving to AWS ([077cbf1](https://github.com/DiscordHotline/application-plugin/commit/077cbf1))

## [1.30.1](https://github.com/DiscordHotline/application-plugin/compare/v1.30.0...v1.30.1) (2019-05-12)


### Bug Fixes

* **approving:** Wrap the fetching of invite in a trycatch in case the requestee didn't give a permanent one ([ef6fa42](https://github.com/DiscordHotline/application-plugin/commit/ef6fa42))

# [1.30.0](https://github.com/DiscordHotline/application-plugin/compare/v1.29.0...v1.30.0) (2019-05-12)


### Bug Fixes

* **approving:** Moved welcome message outside embed so the mentions resolve ([c44cc97](https://github.com/DiscordHotline/application-plugin/commit/c44cc97))


### Features

* **approving:** Added guild icon & name to welcome message ([e48f3f0](https://github.com/DiscordHotline/application-plugin/commit/e48f3f0))

# [1.29.0](https://github.com/DiscordHotline/application-plugin/compare/v1.28.3...v1.29.0) (2019-05-09)


### Features

* **approving:** Automatically add requestee as representative and member once their application passes ([ab6a9c4](https://github.com/DiscordHotline/application-plugin/commit/ab6a9c4))
* **approving:** Welcome server representative/owner once their vote has passed ([da0e7d6](https://github.com/DiscordHotline/application-plugin/commit/da0e7d6))

## [1.28.3](https://github.com/DiscordHotline/application-plugin/compare/v1.28.2...v1.28.3) (2019-03-08)


### Bug Fixes

* **claim:** Support all the available invite formats ([#5](https://github.com/DiscordHotline/application-plugin/issues/5)) ([940650d](https://github.com/DiscordHotline/application-plugin/commit/940650d))

## [1.28.2](https://github.com/DiscordHotline/application-plugin/compare/v1.28.1...v1.28.2) (2019-02-27)


### Bug Fixes

* **commands:** Adding alias for role colour ([acc06d3](https://github.com/DiscordHotline/application-plugin/commit/acc06d3))
* **Merge:** github.com:DiscordHotline/application-plugin ([d54c466](https://github.com/DiscordHotline/application-plugin/commit/d54c466))

## [1.28.1](https://github.com/DiscordHotline/application-plugin/compare/v1.28.0...v1.28.1) (2019-02-25)


### Bug Fixes

* **color:** Removing hex shorthand ([74ad574](https://github.com/DiscordHotline/application-plugin/commit/74ad574))
* **roleName:** Fixing error message for bad name ([d6aa715](https://github.com/DiscordHotline/application-plugin/commit/d6aa715))

# [1.28.0](https://github.com/DiscordHotline/application-plugin/compare/v1.27.1...v1.28.0) (2019-02-25)


### Bug Fixes

* **tests:** Fixing peer dependencies ([8d2134d](https://github.com/DiscordHotline/application-plugin/commit/8d2134d))
* **tests:** Fixing peer dependencies ([4cbbbae](https://github.com/DiscordHotline/application-plugin/commit/4cbbbae))
* **tests:** Fixing peer dependencies ([c50f2c9](https://github.com/DiscordHotline/application-plugin/commit/c50f2c9))
* **tests:** Fixing peer dependencies ([0d074f9](https://github.com/DiscordHotline/application-plugin/commit/0d074f9))


### Features

* **commands:** New Role Management commands ([0b0dc3d](https://github.com/DiscordHotline/application-plugin/commit/0b0dc3d))

## [1.27.1](https://github.com/DiscordHotline/application-plugin/compare/v1.27.0...v1.27.1) (2019-02-24)


### Bug Fixes

* **approveOrDeny:** Add member role if missing ([504f7ea](https://github.com/DiscordHotline/application-plugin/commit/504f7ea))

# [1.27.0](https://github.com/DiscordHotline/application-plugin/compare/v1.26.0...v1.27.0) (2019-02-20)


### Features

* **leaveBadGuilds:** Add server owner to notification ([df687ee](https://github.com/DiscordHotline/application-plugin/commit/df687ee))

# [1.26.0](https://github.com/DiscordHotline/application-plugin/compare/v1.25.2...v1.26.0) (2019-02-14)


### Bug Fixes

* **Errors:** Potential fix for incorrect stacktrace ([597bcab](https://github.com/DiscordHotline/application-plugin/commit/597bcab))


### Features

* **updateGuildListCommand:** Added simple ok reaction ([45c5dc8](https://github.com/DiscordHotline/application-plugin/commit/45c5dc8))

## [1.25.2](https://github.com/DiscordHotline/application-plugin/compare/v1.25.1...v1.25.2) (2019-02-14)


### Bug Fixes

* **updateServerList:** Sort existing messages by date ([f091b0f](https://github.com/DiscordHotline/application-plugin/commit/f091b0f))

## [1.25.1](https://github.com/DiscordHotline/application-plugin/compare/v1.25.0...v1.25.1) (2019-02-14)


### Bug Fixes

* **approve/deny:** Moved app msg update to approveOrDeny function ([fee06fe](https://github.com/DiscordHotline/application-plugin/commit/fee06fe))

# [1.25.0](https://github.com/DiscordHotline/application-plugin/compare/v1.24.2...v1.25.0) (2019-02-11)


### Features

* **UpdateCommand:** Command to update application message ([17d5c8d](https://github.com/DiscordHotline/application-plugin/commit/17d5c8d))

## [1.24.2](https://github.com/DiscordHotline/application-plugin/compare/v1.24.1...v1.24.2) (2019-02-11)


### Bug Fixes

* **checkApplication:** Update application message after finishing vote ([b12c59a](https://github.com/DiscordHotline/application-plugin/commit/b12c59a))

## [1.24.1](https://github.com/DiscordHotline/application-plugin/compare/v1.24.0...v1.24.1) (2019-02-11)


### Bug Fixes

* **approve:** Fix for role id not being saved ([0ea5a55](https://github.com/DiscordHotline/application-plugin/commit/0ea5a55))

# [1.24.0](https://github.com/DiscordHotline/application-plugin/compare/v1.23.0...v1.24.0) (2019-02-11)


### Features

* **applicationEmbed:** Added color to the embed that changes depending on the vote status ([d37262d](https://github.com/DiscordHotline/application-plugin/commit/d37262d))

# [1.23.0](https://github.com/DiscordHotline/application-plugin/compare/v1.22.0...v1.23.0) (2019-02-09)


### Features

* **listUpdateCommand:** Added command to manually trigger a server list update with ([ab5b184](https://github.com/DiscordHotline/application-plugin/commit/ab5b184))
* **pluginConfig:** Added dividerRole & serverListChannel ([d70106b](https://github.com/DiscordHotline/application-plugin/commit/d70106b))
* **updateServerList:** Automatically update server list ([9d03f21](https://github.com/DiscordHotline/application-plugin/commit/9d03f21))

# [1.22.0](https://github.com/DiscordHotline/application-plugin/compare/v1.21.0...v1.22.0) (2019-02-09)


### Features

* **leaveBadGuilds:** Disabled automatic leaving for now and just send a notification instead ([1f4b522](https://github.com/DiscordHotline/application-plugin/commit/1f4b522))
* **leaveBadGuilds:** Removed importing roles as it's not needed anymore ([b373556](https://github.com/DiscordHotline/application-plugin/commit/b373556))

# [1.21.0](https://github.com/DiscordHotline/application-plugin/compare/v1.20.1...v1.21.0) (2019-02-09)


### Features

* **approval:** Automatically add/remove the appropriate roles if applicant is already a member ([338c550](https://github.com/DiscordHotline/application-plugin/commit/338c550))

## [1.20.1](https://github.com/DiscordHotline/application-plugin/compare/v1.20.0...v1.20.1) (2019-02-09)


### Bug Fixes

* **release:** Fixing semantic-release ([e655fd4](https://github.com/DiscordHotline/application-plugin/commit/e655fd4))
