# pisignage.com does not load or gives error after signin

Source: https://help.pisignage.com/hc/en-us/articles/360001236111-pisignage-com-does-not-load-or-gives-error-after-signin

After login or signup, server takes the user to <username>.pisignage.com for secure access. Looks like the proxy settings are not proper for the subdomain. If you have the Proxy setting as pisignage.com you may want to add it is *.pisignage.com.
