# 1.2.1

* Improve handling of demo accounts

# 1.2.0

* Added a wrapper for Mojang's Yggdrasil authentication system.
* Added support for skin upload/reset
* Added support for name changing

# 1.1.4

* Added support for Minecraft's older ping protocol

# 1.1.3

* Added missing file

# 1.1.2

* Fixed issue in socket handling that caused unhandled errors when the socket prematurely closed.

# 1.1.1

* Fixed issue in socket handling that would raise an error despite receiving a valid response.
* Fixed an incorrect documentation header.

# 1.1.0

* Added support for a custom socket timeout.
    * Changed usage for `.pingServer()`

# 1.0.2

* Remove accidentally left-in `console.log` statement

# 1.0.1

* Improved error handling (socket errors are now handleable as promise rejections)
* Added transparent SRV record handling so servers which use them can be pinged
* Removed mistakenly added dependencies

# 1.0.0

Initial release