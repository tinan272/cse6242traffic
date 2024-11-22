//init map
const platform = new H.service.Platform({
    apikey: "wQndyHdPqoKFF6eE1ei474ph9GxP7ChUlA06sbeeQjQ",
});
const defaultLayers = platform.createDefaultLayers();
const map = new H.Map(
    document.getElementById("map"),
    defaultLayers.vector.normal.map,
    {
        zoom: 12,
        center: { lat: 33.7501, lng: -84.3885 },
        padding: { top: 50, right: 50, bottom: 50, left: 50 },
    }
);

// MapEvents enables the event system.
const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

// Enable dynamic resizing
window.addEventListener("resize", () => map.getViewPort().resize());

const segmentColors = ["#FF0000", "#00FF00", "#0000FF", "#FFA500", "#800080"];

let currentRouteGroup = null;

function calculateRoute(origin, destination, waypoints = []) {
    if (currentRouteGroup) {
        map.removeObject(currentRouteGroup);
    }

    const waypointMarkers = [];
    const routingParameters = {
        routingMode: "fast",
        transportMode: "car",
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        return: "polyline",
    };

    // Add waypoints if provided
    if (waypoints.length > 0) {
        routingParameters.via = new H.service.Url.MultiValueQueryParameter(
            waypoints.map((wp) => `${wp.lat},${wp.lng}`)
        );

        waypoints.forEach((waypoint) => {
            const waypointMarker = new H.map.Marker({
                lat: waypoint.lat,
                lng: waypoint.lng,
            });
            waypointMarkers.push(waypointMarker);
        });
    }

    const onResult = function (result) {
        if (result.routes.length) {
            const group = new H.map.Group();
            // Process each section of the route
            result.routes[0].sections.forEach((section, index) => {
                // Create a linestring for this section
                const lineString = H.geo.LineString.fromFlexiblePolyline(
                    section.polyline
                );

                // Create a polyline with a unique color for this section
                const routeLine = new H.map.Polyline(lineString, {
                    style: {
                        strokeColor:
                            segmentColors[index % segmentColors.length],
                        lineWidth: 3,
                    },
                });

                group.addObject(routeLine);
            });
            // Add markers
            const startMarker = new H.map.Marker(origin);
            const endMarker = new H.map.Marker(destination);
            // Add all objects to the group
            group.addObjects([startMarker, endMarker, ...waypointMarkers]);
            // Store the current route group
            currentRouteGroup = group;
            // Add the group to the map
            map.addObject(group);
            // Set the map viewport to make the entire route visible
            map.getViewModel().setLookAtData({
                bounds: group.getBoundingBox(),
            });
        }
    };

    // Get routing service and calculate route
    const router = platform.getRoutingService(null, 8);
    router.calculateRoute(routingParameters, onResult, function (error) {
        alert(error.message);
    });
}

const origin = { lat: 33.7756, lng: -84.3963 };
const destination = { lat: 33.9232, lng: -84.3408 };
const waypoints = [
    { lat: 33.7916, lng: -84.3983 },
    { lat: 33.8218, lng: -84.3785 },
];

function addRoute(origin = {}, destination = {}, waypoints = []) {
    calculateRoute(origin, destination, waypoints);
}

// Call addRoute with the example coordinates
addRoute(origin, destination, waypoints);
