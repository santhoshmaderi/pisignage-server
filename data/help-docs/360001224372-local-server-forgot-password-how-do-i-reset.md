# Local server - Forgot password, How do I reset

Source: https://help.pisignage.com/hc/en-us/articles/360001224372-Local-server-Forgot-password-How-do-I-reset

In mongo shell, delete settings collection and restart the server

- mongo

>> use pisignage-server-dev

>> db.settings.remove({"installation":"your username"})
