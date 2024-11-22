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

// Create the default UI components and store ui variable globally
const ui = H.ui.UI.createDefault(map, defaultLayers);
// MapEvents enables the event system.
const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
window.addEventListener("resize", () => map.getViewPort().resize());

const routeHighlightStyling = {
    lineWidth: 5,
    strokeColor: "#FFFF00",
};

let currentRouteGroup = null;
let currPopUp = null;

function calculateRoute(origin, destination, waypoints = []) {
    if (currentRouteGroup) {
        map.removeObject(currentRouteGroup);
    }

    // Define allPoints array here
    const allPoints = [origin, ...waypoints, destination];

    const waypointMarkers = [];
    const routingParameters = {
        routingMode: "fast",
        transportMode: "car",
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        return: "polyline,summary", // Add summary to get distance and duration
    };

    if (waypoints.length > 0) {
        routingParameters.via = new H.service.Url.MultiValueQueryParameter(
            waypoints.map((wp) => `${wp.lat},${wp.lng}`)
        );

        waypoints.forEach((waypoint, index) => {
            const waypointMarker = new H.map.Marker({
                lat: waypoint.lat,
                lng: waypoint.lng,
            });
            waypointMarker.setData(`Waypoint ${index + 1}`);
            waypointMarkers.push(waypointMarker);
        });
    }

    const onResult = function (result) {
        if (result.routes.length) {
            const group = new H.map.Group();

            // Process each section of the route
            result.routes[0].sections.forEach((section, index) => {
                const lineString = H.geo.LineString.fromFlexiblePolyline(
                    section.polyline
                );
                const routeLine = new H.map.Polyline(lineString, {
                    style: {
                        strokeColor: "grey",
                        lineWidth: 3,
                    },
                });
                const routeData = {
                    distance: section.summary.length / 1000, // km
                    duration: Math.round(section.summary.duration / 60), // minutes
                    index: index,
                    polyline: lineString,
                    startPnt: allPoints[index],
                    endPnt: allPoints[index + 1],
                };
                routeLine.setData(routeData);

                routeLine.addEventListener("pointerenter", onEnter);
                routeLine.addEventListener("pointerleave", onLeave);
                routeLine.addEventListener("tap", onClick);

                group.addObject(routeLine);
            });

            const startMarker = new H.map.Marker(origin);
            startMarker.setData("Origin");
            const endMarker = new H.map.Marker(destination);
            endMarker.setData("Destination");

            group.addObjects([startMarker, endMarker, ...waypointMarkers]);
            currentRouteGroup = group;
            map.addObject(group);

            map.getViewModel().setLookAtData({
                bounds: group.getBoundingBox(),
            });
        }
    };

    const router = platform.getRoutingService(null, 8);
    router.calculateRoute(routingParameters, onResult, function (error) {
        alert(error.message);
    });
}

function onEnter(event) {
    const polyline = event.target;
    const ogStyle = polyline.getStyle();
    polyline.setData({
        ...polyline.getData(),
        ogStyle: ogStyle,
    });
    polyline.setStyle(routeHighlightStyling);
}

function onLeave(event) {
    const polyline = event.target;
    const data = polyline.getData();
    if (data.ogStyle) {
        polyline.setStyle(data.ogStyle);
    }
}

function onClick(event) {
    if (currPopUp) {
        ui.removeBubble(currPopUp);
        currPopUp = null;
    }
    const polyline = event.target;
    const data = polyline.getData();

    // clicked coordinates
    const coord = map.screenToGeo(
        event.currentPointer.viewportX,
        event.currentPointer.viewportY
    );

    // route descript.
    let segmentDescription = "";
    if (data.index === 0) {
        segmentDescription =
            "Origin to " +
            (waypoints.length > 0 ? "First Waypoint" : "Destination");
    } else if (data.index === waypoints.length) {
        segmentDescription = "Last Waypoint to Destination";
    } else {
        segmentDescription = `Waypoint ${data.index} to Waypoint ${
            data.index + 1
        }`;
    }
    const routeInfo = `
        <div style="padding: 10px; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0;">${segmentDescription}</h4>
            <p style="margin: 4px 0;"><strong>From:</strong> ${formatCoordinates(
                data.startPnt
            )}</p>
            <p style="margin: 4px 0;"><strong>To:</strong> ${formatCoordinates(
                data.endPnt
            )}</p>
            <p style="margin: 4px 0;">Distance: ${data.distance.toFixed(
                2
            )} km</p>
            <p style="margin: 4px 0;">Duration: ${data.duration} minutes</p>
        </div>`;

    currPopUp = new H.ui.InfoBubble(coord, {
        content: routeInfo,
    });
    ui.addBubble(currPopUp);
}

function formatCoordinates(point) {
    return `(${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`;
}

function addRoute(origin = {}, destination = {}, waypoints = []) {
    calculateRoute(origin, destination, waypoints);
}

// example coordinates
const origin = { lat: 33.7756, lng: -84.3963 };
const destination = { lat: 33.9232, lng: -84.3408 };
const waypoints = [
    { lat: 33.7916, lng: -84.3983 },
    { lat: 33.8218, lng: -84.3785 },
];

addRoute(origin, destination, waypoints);
