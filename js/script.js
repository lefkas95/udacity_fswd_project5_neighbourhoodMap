const locations = [
    {id: 0, title: 'Rathaus', location: {lat: 47.426729, lng: 12.848427}},
    {id: 1, title: 'Ritzensee', location: {lat: 47.418849, lng: 12.846422}},
    {id: 2, title: 'Bahnhof', location: {lat: 47.426946, lng: 12.830313}},
    {id: 3, title: 'Bsuch', location: {lat: 47.398340, lng: 12.840933}},
    {id: 4, title: 'Nowhere', location: {lat: 47.426965, lng: 12.832494}}
];

// Please enter your foursquare credentials here
const foursquare_id = "ZGOFVNE4UUK2FMLVIRA3GBVR0JEIO5HISOJJAWX0RHHHYJQ3";
const foursquare_secret = "X3EAFLLS4JWHHHCVCPZANUC5AL3QA4BD5RPS1QXQZF0VK1CW";

const fourSquareUrl = 'https://api.foursquare.com/v2/venues/explore?client_id='
    + foursquare_id + '&client_secret='
    + foursquare_secret + '&v=20180323&query=restaurant';

const ViewModel = function() {
    const self = this;

    this.defaultIcon = null;
    this.highlightedIcon = null;
    this.filter = ko.observable('');
    this.markerList = ko.observableArray([]);
    this.map = {};
    this.markers = [];
    this.largeInfoWindow = null;

    // Find a restaurant near each location using the Foursquare - API
    this.initFoursquareData = function() {
        let errorOccured = false;
        locations.forEach((location) => {
            // Build location string in format '<latitude>,<longitude>'
            const ll = location.location.lat + ',' + location.location.lng;
            $.getJSON(fourSquareUrl + '&ll=' + ll, (response) => {
                // Take the first restaurant (if available)
                if (response && response.response && response.response.groups[0] && response.response.groups[0].items[0]) {
                    const venue = response.response.groups[0].items[0].venue;
                    location.restaurant = venue.name + ' (' + venue.location.distance + 'm away)';
                } else {
                    console.log('No restaurant found near ' + location.title);
                }
            }).error(() => {
                console.log('Error while requesting restaurant info for location ' + location.title);
                // Flag used to only show the error once for all request
                if (!errorOccured) {
                    errorOccured = true;
                    alert('Error while loading restaurant infos of FourSquare');
                }
            });
        });
    };

    // Initializes the map. Should only be called once.
    this.initMap = function() {
        const centerCoordinates = {lat: 47.426944, lng: 12.848333};

        // Used for hover highlighting of the markers
        this.defaultIcon = createMarkerIcon('0091ff');
        this.highlightedIcon = createMarkerIcon('ffff24');

        this.map = new google.maps.Map(document.getElementById('map'), {
            center: centerCoordinates,
            zoom: 15,
            mapTypeControl: false,
            mapTypeId: 'hybrid'
        });

        // Will be loaded with data of a specific marker if cloicked via map or list view
        this.largeInfoWindow = new google.maps.InfoWindow();

        locations.forEach((location) => {
            const marker = new google.maps.Marker({
                position: location.location,
                title: location.title,
                id: location.id,
                icon: this.defaultIcon,
                animation: google.maps.Animation.DROP
            });

            this.markers.push(marker);
            marker.addListener('click', () => {
                // Bounce animation when clicking the marker
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => marker.setAnimation(null), 1500);

                // Open the info window
                populateInfoWindow(marker, this.largeInfoWindow);
            });

            // Used for hover effects
            marker.addListener('mouseover', () => marker.setIcon(this.highlightedIcon));
            marker.addListener('mouseout', () => marker.setIcon(this.defaultIcon));
        });

        this.renderMarkersAndList();
    };

    // Render all markers and list view items which should be visible
    this.renderMarkersAndList = function() {
        const filterValue = this.filter().toLowerCase();
        const bounds = new google.maps.LatLngBounds();
        let visibleMarkers = 0;
        this.markerList([]);

        this.markers.forEach((marker) => {
            // Show all if filter is empty or those elements which contain the filter in their title
            if (filterValue === '' || marker.title.toLowerCase().includes(filterValue)) {
                marker.setMap(this.map);
                bounds.extend(marker.position);
                this.markerList.push(marker);
                visibleMarkers++;
            } else {
                marker.setMap(null)
            }
        });

        if (visibleMarkers > 0) {
            // For zooming in or out to perfectly show all visible markers
            this.map.fitBounds(bounds);
        }
    };

    // Show marker info when clicking an list item
    this.showMarkerInfo = function(domMarker) {
        // If a user clicks on two list items without closing the infoWindow in between,
        // the animation of the previous one should be stopped
        self.stopAllMarkerAnimations();
        domMarker.setAnimation(google.maps.Animation.BOUNCE);
        populateInfoWindow(domMarker, self.largeInfoWindow);
    };

    this.stopAllMarkerAnimations = function() {
        this.markers.forEach((marker) => marker.setAnimation(null));
    };
};

const viewModel = new ViewModel();
// Create ViewModel
ko.applyBindings(viewModel);

// Callback when Google API is fully loaded
function googleApiCallback() {
    viewModel.initFoursquareData();
    viewModel.initMap();
}

// Error handler for Google Maps
function googleError() {
    alert('Error while loading google maps');
}


/**
 * Helpers
 */

function createMarkerIcon(color) {
    return new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + color + '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34),
    );
}

function populateInfoWindow(marker, infoWindow) {
    if (infoWindow.marker !== marker) {
        infoWindow.marker = marker;
        infoWindow.addListener('closeclick', () => {
            if (infoWindow.marker) {
                infoWindow.marker.setAnimation(null);
            }
            infoWindow.marker = null;
        });

        const streetViewService = new google.maps.StreetViewService();
        const radius = 50;

        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        infoWindow.open(map, marker);

        // Try to find a proper street view panorama
        function getStreetView(data, status) {
            let restaurant;
            locations.forEach((location) => {
                if (location.id === marker.id) {
                    restaurant = location.restaurant;
                }
            });

            let infoContent = '<h2>' + marker.title + '</h2>';

            // Add restaurant information to the info window if present
            infoContent += restaurant
                ? '<span class="restaurant-info">Suggested restaurant: ' + restaurant + '</span>'
                : '<span class="restaurant-info">No restaurant found near this place.</span>';

            if (status === google.maps.StreetViewStatus.OK) {
                const nearStreetViewLocation = data.location.latLng;
                const heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
                infoContent += '<div id="pano"></div>';
                infoWindow.setContent(infoContent);
                const panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 30
                    }
                };

                // No knockout binding because of Maps API - as described in the project requirements.
                new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
            } else {
                infoContent += '<div>No Street View Found</div>';
                infoWindow.setContent(infoContent);
            }
        }
    }
}