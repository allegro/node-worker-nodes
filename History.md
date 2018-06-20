1.6.1 / 2018-06-20
==================

  * support for `--inspect-brk` flag added (@lev-kazakov)

1.6.0 / 2017-09-12
==================

  * message-pack streaming disabled
  * typescript definitions added (@MariusAlch)
  * readme typo fixes (@crcastle)

1.5.0 / 2017-06-22
==================

  * message-pack streaming (@noam-almog)
  
1.4.0 / 2017-05-29
==================

* bson serializer replaced with message-pack (@noam-almog)

1.3.1 / 2017-02-05
==================

  * Minor performance fix: getting rid of array destructuring as it prevents code runtime optimization
  in current v8
  
1.3.0 / 2017-01-23
==================

* Workers do not accept work when they are in process of booting up (@mheiniger)
  
1.2.1 / 2016-12-19
==================

 * Dependencies update

1.2.0 / 2016-11-08
==================

  * Moved away from sending data through `'ipc'` channel in favour of a specialized `'pipe'`.
  * Removed <code>useCompression</code> option (because it seems pointless when a new transfer format is in use).

1.1.0 / 2016-11-02
==================

  * Added <code>useCompression</code> option
  
1.0.0 / 2016-11-01
==================

  * Initial release
