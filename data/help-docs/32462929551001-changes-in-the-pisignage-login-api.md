# Changes in the piSignage login API

Source: https://help.pisignage.com/hc/en-us/articles/32462929551001-Changes-in-the-piSignage-login-API

piSignage release 3.5.0 includes a security update to allow access from authorised locations.

 

NOTE: If MFA is disabled in your piSignage account, an OTP is sent to your registered email when logging in from a new location. The OTP wont be required for successive login requests from the same location. 

 

Here are some changes to the login API for the following use cases

- Accessing piSignage from a new location

- MFA is enabled in your account.

 

- Send a POST request to /api/session with your ( email, password, getToken ) in the body of the request. You should receive a response with 401 Unauthorised along with an OTP to your registered email.

- Now send a POST request to /api/session with the (email, password, getToken, code : <received-otp-code> ) in the body of the request. You should get a 200 OK response with the login token.
