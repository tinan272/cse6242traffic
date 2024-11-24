const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([0, 7000]);
const platform = new H.service.Platform({
    apikey: "wQndyHdPqoKFF6eE1ei474ph9GxP7ChUlA06sbeeQjQ",
});
const defaultLayers = platform.createDefaultLayers({
    vector: {
        normal: {
            map: {
                style: "lite",
                base: "base",
            },
        },
    },
});
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
const customStyle = {
    layers: {
        roads: {
            highway: {
                fill: {
                    color: "#FF0000", // Red color for highways
                },
                outline: {
                    color: "#FFFFFF", // White outline for contrast
                    width: 2,
                },
            },
        },
    },
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
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        return: "polyline,summary", // Add summary to get distance and duration
    };

    if (waypoints.length > 0) {
        routingParameters.via = new H.service.Url.MultiValueQueryParameter(
            waypoints.map((wp) => `${wp.latitude},${wp.longitude}`)
        );

        // waypoints.forEach((waypoint, index) => {
        //     var waypointSVG = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        //     <rect stroke="white" fill="#FF6347" x="1" y="1" width="22" height="22" />
        //     <text x="12" y="18" font-size="12pt" font-family="Arial" font-weight="bold" text-anchor="middle" fill="white">
        //         ${index + 1}
        //     </text>
        // </svg>`;
        // const waypointIcon = new H.map.Icon(waypointSVG, {
        //     size: { w: 24, h: 24 },
        //     anchor: { x: 12, y: 12 }, // Anchor the icon to the center
        // });
        // const waypointMarker = new H.map.Marker(
        //     {
        //         lat: waypoint.latitude,
        //         lng: waypoint.longitude,
        //     },
        //     { icon: waypointIcon }
        // );
        // waypointMarker.setData(`Waypoint ${index + 1}`);
        // waypointMarkers.push(waypointMarker);
        // });
        var originSVG =
            '<svg width="24" height="24" ' +
            'xmlns="http://www.w3.org/2000/svg">' +
            '<rect stroke="white" fill="#1b468d" x="1" y="1" width="22" ' +
            'height="22" /><text x="12" y="18" font-size="12pt" ' +
            'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
            'fill="white">O</text></svg>';
        var destinationSVG =
            '<svg width="24" height="24" ' +
            'xmlns="http://www.w3.org/2000/svg">' +
            '<rect stroke="white" fill="#1b468d" x="1" y="1" width="22" ' +
            'height="22" /><text x="12" y="18" font-size="12pt" ' +
            'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
            'fill="white">D</text></svg>';
        const originIcon = new H.map.Icon(originSVG, {
            size: { w: 24, h: 24 },
            anchor: { x: 12, y: 12 },
        });
        const originMarker = new H.map.Marker(
            { lat: origin.latitude, lng: origin.longitude },
            { icon: originIcon }
        );
        originMarker.setData({ type: "Origin" });
        waypointMarkers.push(originMarker);

        const destinationIcon = new H.map.Icon(destinationSVG, {
            size: { w: 24, h: 24 },
            anchor: { x: 12, y: 12 },
        });
        const destinationMarker = new H.map.Marker(
            { lat: destination.latitude, lng: destination.longitude },
            { icon: destinationIcon }
        );
        destinationMarker.setData({ type: "Destination" });
        waypointMarkers.push(destinationMarker);
    }

    const onResult = function (result) {
        if (result.routes.length) {
            const group = new H.map.Group();

            // Process each section of the route
            result.routes[0].sections.forEach((section, index) => {
                const lineString = H.geo.LineString.fromFlexiblePolyline(
                    section.polyline
                );
                const routeData = {
                    distance: section.summary.length / 1000, // km
                    duration: Math.round(section.summary.duration / 60), // minutes
                    index: index,
                    polyline: lineString,
                    startPnt: allPoints[index],
                    endPnt: allPoints[index + 1],
                    waypoints: waypoints,
                    accident_count: allPoints[index]?.accident_count || 0,
                };

                // Define the route line
                const routeLine = new H.map.Polyline(lineString, {
                    style: {
                        strokeColor: colorScale(routeData.accident_count),
                        lineWidth: 6,
                        lineJoin: "round",
                    },
                });

                const routeOutlineLine = new H.map.Polyline(lineString, {
                    style: {
                        strokeColor: "#000000",
                        lineWidth: 8,
                        lineJoin: "round",
                    },
                });
                routeLine.setData(routeData);
                routeLine.addEventListener("pointerenter", onEnter);
                routeLine.addEventListener("pointerleave", onLeave);
                routeLine.addEventListener("tap", onClick);
                group.addObjects([routeOutlineLine, routeLine]);
            });

            const startMarker = new H.map.Marker({
                lat: origin.latitude,
                lng: origin.longitude,
            });
            startMarker.setData("Origin");
            const endMarker = new H.map.Marker({
                lat: destination.latitude,
                lng: destination.longitude,
            });
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
    const waypoints = data.waypoints;

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
            <p style="margin: 0 0 8px 0;"><strong>Accidents</strong>: ${
                data.accident_count
            }</p>
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
    console.log(point);
    return `(${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)})`;
}

function addRoute(feats) {
    const features = feats["features"];
    const origin = features[0]["properties"];
    const destination = features[features.length - 1]["properties"];
    const waypoints = features
        .slice(1, -1)
        .map((feature) => feature["properties"]);
    console.log(waypoints);
    calculateRoute(origin, destination, waypoints);
}

// example coordinates
// const origin = { lat: 33.7756, lng: -84.3963 };
// const destination = { lat: 33.9232, lng: -84.3408 };
// const waypoints = [
//     { lat: 33.7916, lng: -84.3983 },
//     { lat: 33.8218, lng: -84.3785 },
// ];
const features = {
    features: [
        {
            type: "Feature",
            properties: {
                latitude: 33.37476,
                longitude: -84.79956,
                accident_count: 279,
            },
        },
        {
            type: "Feature",
            properties: {
                latitude: 33.85436,
                longitude: -83.93324,
                accident_count: 23,
            },
        },
        {
            type: "Feature",
            properties: {
                latitude: 32.97327,
                longitude: -82.80873,
                accident_count: 115,
            },
        },
        {
            type: "Feature",
            properties: {
                latitude: 33.6555,
                longitude: -84.40319,
                accident_count: 125,
            },
        },
    ],
};

addRoute(features);
showLegend();

function showLegend() {
    const legendContainer = document.createElement("div");
    legendContainer.style.cssText = `
        background: rgba(255, 255, 255, 0.9);
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 1000;
        height: 100px;
    `;
    const title = document.createElement("div");
    title.textContent = "Accident Count";
    title.style.marginBottom = "5px";
    title.style.fontWeight = "bold";
    legendContainer.appendChild(title);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "200");
    svg.setAttribute("height", "50");

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const linearGradient = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "linearGradient"
    );
    linearGradient.setAttribute("id", "accident-gradient");
    linearGradient.setAttribute("x1", "0%");
    linearGradient.setAttribute("x2", "100%");
    linearGradient.setAttribute("y1", "0%");
    linearGradient.setAttribute("y2", "0%");

    const stops = 10;
    for (let i = 0; i <= stops; i++) {
        const stop = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "stop"
        );
        const value = i * (7000 / stops);
        stop.setAttribute("offset", `${(i / stops) * 100}%`);
        stop.setAttribute("stop-color", colorScale(value));
        linearGradient.appendChild(stop);
    }

    defs.appendChild(linearGradient);
    svg.appendChild(defs);

    const gradientRect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
    );
    gradientRect.setAttribute("x", "10");
    gradientRect.setAttribute("y", "10");
    gradientRect.setAttribute("width", "180");
    gradientRect.setAttribute("height", "20");
    gradientRect.setAttribute("fill", "url(#accident-gradient)");
    svg.appendChild(gradientRect);

    const labels = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const minLabel = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
    );
    minLabel.setAttribute("x", "10");
    minLabel.setAttribute("y", "45");
    minLabel.setAttribute("font-size", "12");
    minLabel.textContent = "0";
    const maxLabel = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
    );
    maxLabel.setAttribute("x", "170");
    maxLabel.setAttribute("y", "45");
    maxLabel.setAttribute("font-size", "12");
    maxLabel.textContent = "7000";
    labels.appendChild(minLabel);
    labels.appendChild(maxLabel);
    svg.appendChild(labels);
    legendContainer.appendChild(svg);
    document.getElementById("map").appendChild(legendContainer);
}
