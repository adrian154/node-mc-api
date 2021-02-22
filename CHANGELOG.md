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