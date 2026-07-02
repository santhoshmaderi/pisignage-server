# Setting Up SAML SSO for piSignage with Microsoft Entra ID

Source: https://help.pisignage.com/hc/en-us/articles/40667663637145-Setting-Up-SAML-SSO-for-piSignage-with-Microsoft-Entra-ID

Setting up SAML SSO for piSignage with Microsoft Entra ID requires configuring both platforms (Microsoft Azure and piSignage) to securely authenticate users. Here's a general overview of the process:

-

Click on the Sign Up with SSO option in https://pisignage.com/signup and you should see a popup.

 

-

During the configuration process, you'll be prompted to enter your login credentials.

Username: Enter the username you want to use for your piSignage account.
Email: Enter the email address associated with your Microsoft Entra ID account. This email will be used to identify you within piSignage.
Example:
Username: johndoe (This can be any username you choose)
Email: [admin@testapp.onmicrosoft.com] (The email linked to your Microsoft Entra ID)

 

- If an application doesn't already exist in Microsoft Entra ID, create a new Enterprise Application.
- Sign in to the Azure Portal.

- Navigate to Home >  Enterprise applications.

- Click Create your own application, you can name your application piSignage SSO

- Add users to the application 

 

-
Set Issuer  as the Identifier (Entity ID) (instead of earlier instructions of adding the application ID)
 

-

Configure SAML Single Sign-On:

- In the Single sign-on tab, select SAML.

 

- Setup the the Basic SAML Configuration section by clicking on the Edit icon and add the following URL maps
-
Identifier (Entity ID): https://pisignage.com/saml-authenticated

-
Reply URL: https://pisignage.com/saml-authenticated

-
Logout URL: https://pisignage.com/saml-authenticated

-
NOTE: Make sure that you SAVE these changes.

 

-
Enter the Login URL field and the Certificate field
- Copy the Login URL as it is to the Entry Point URL field in your SSO form

- Download the Base64 certificate and open it in a text editor. Now copy paste the content of the certificate in the Certificate field

- Your certificate should look like this

 

-
Click on the Sign Up button to create your piSignage account.

 

-
You will be redirected to the login page where you can click on the Login with SSO option. Enter the username of the newly created account and click Log In.

 

-
You should now be redirected to your Microsoft Login page. After successful login, you should be logged into your piSignage dashboard.

 

 

Adding Collaborators to Your piSignage Account

Want to share access to your piSignage account with colleagues? Here's how to add collaborators

 

Adding Existing piSignage Users as Collaborators:

Existing piSignage users added as collaborators will not be able to use SSO. They'll need to log in using their individual username and password.

 

Adding New Collaborators:

Enable SSO for New Collaborators:
When creating a new collaborator, you can choose to apply the same SSO configuration as your account by clicking on the Enable SSO Login button.
However, each collaborator will need a unique email address linked to their Microsoft Azure account.
