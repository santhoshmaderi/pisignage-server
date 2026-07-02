# How to show Grafana dashboards in Pisignage players

Source: https://help.pisignage.com/hc/en-us/articles/44203912461081-How-to-show-Grafana-dashboards-in-Pisignage-players
Keywords: grafana

Steps to Create a Service Account and Generate Token for Pi Signage Integration with Grafana

1) Create Service Account

- Go to Grafana.

- Navigate to Administration > Users and Access > Service Accounts.

- Click on “Add service Account”.

- Provide a name, e.g., “pisignage”.

- Assign the Role as “Viewer” from the dropdown (you can change this based on requirements).

- Click Apply

- Click Create.

 

 

2) Generate Token

- After creating the service account, click on it to open its details.

- Click on “Add Service Account Token”.

-
Provide a name for the token (e.g., PiSignage-Token).

- Click “Generate Token”.

- Copy the token generated (this is critical for Pi Signage integration).

- Ensure the token never expires (or set an appropriate expiry based on your security policy).

-
Example token:
glsa_P7TUMwo7rTXnbGjYh1P1y4xxxxx_bae5ff42

 

3) Assign Dashboard Permissions

- Go to Dashboards and select the dashboard you want to share.

- Click on “Edit” 

- Navigate to Settings > Permissions.

-
Add View Permission to the Service Account (pisignage) for this dashboard.

- Save the dashboard and Exit Edit mode.

 

 

 

4) Enable Kiosk Mode

- Click on the “Enable Kiosk Mode” button (located at the top-right corner of the dashboard).

- Copy the URL displayed in the browser’s address bar while in Kiosk mode.

 

5) Configure Pi Signage

- Log in to Pi Signage.

- Go to Assets.

- Click on Add Link.

- Choose the type as WebPage.

- Update the Link Address field with the URL copied earlier from Grafana (Kiosk mode).

-
For Optional Headers, add the token generated earlier in the following format:

Authorization: Bearer <Token>

Example:
Authorization: Bearer glsa_3Vr2BR6UUDBxxxxxx_06a66dc8

 

6) Save and Verify

- Save the configuration in Pi Signage and deploy.

- Verify that the Grafana dashboard is displayed correctly on the Pi Signage screen.

- Consideration: Grafana is a resource-intensive web page. It is recommended that while scheduling, the page be kept open for 60 seconds or more.
