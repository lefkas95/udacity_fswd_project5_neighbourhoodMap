# Neighbourhood Map

Welcome to Saalfelden, my beautiful home town

## Configuration

In order to use the application you need to create an Google Map API account and a Foursquare account to use thair API.

Now set your Google Map API key inside `index.html` in line 35.
You also have to set your client_id and client_secret for the Foursquare API inside `js/script.js` at the top of the file.

The application uses jQuery and Knockout.js and the 3rd party API Foursquare to get restaurant data for specific locations.

## Usage

Simply load the `index.html` file in a web browser like Google Chrome. It will show a map with five locations around my home town.
You can see the titles of them also in the list view on the left side.

Using the input field you can filter the markers and list view. It is a case-insensitive search which checks if the search string is included in the title of a marker.

Clicking on a marker shows some detail information like its name, a recommended restaurant and the distance to it (if available) and a nice panorama view (if available).