import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  Route,
  TrendingUp,
  Map,
  Layers,
} from "lucide-react";

const AIRouteOptimizer = () => {
  const [startCoords, setStartCoords] = useState({
    latitude: "",
    longitude: "",
  });
  const [endCoords, setEndCoords] = useState({ latitude: "", longitude: "" });
  const [waypoints, setWaypoints] = useState([]);
  const [departureTime, setDepartureTime] = useState("");
  const [zones, setZones] = useState([]);
  const [routeResults, setRouteResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveTraffic, setLiveTraffic] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);

  const API_BASE_URL = "http://localhost:8000";

  // Sample coordinates for demo (Indian cities)
  const sampleLocations = {
    mumbai: { latitude: 19.076, longitude: 72.8777 },
    delhi: { latitude: 28.6139, longitude: 77.209 },
    bangalore: { latitude: 12.9716, longitude: 77.5946 },
    pune: { latitude: 18.5204, longitude: 73.8567 },
    chennai: { latitude: 13.0827, longitude: 80.2707 },
  };

  // Initialize zones and departure time
  useEffect(() => {
    const now = new Date();
    setDepartureTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    fetch(`${API_BASE_URL}/zones/all`).then(res => res.json()).then(data => setZones(data.zones || [])).catch(err => console.error(err));
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    const initializeMap = () => {
      // Load Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!window.L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => {
          setupMap();
        };
        document.head.appendChild(script);
      } else {
        setupMap();
      }
    };

    const setupMap = () => {
      if (mapRef.current && !mapInstanceRef.current) {
        // Initialize map centered on India
        mapInstanceRef.current = window.L.map(mapRef.current).setView(
          [20.5937, 78.9629],
          5
        );

        // Add OpenStreetMap tiles
        window.L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
          }
        ).addTo(mapInstanceRef.current);

        // Add custom traffic overlay (simulated)
        const trafficLayer = window.L.layerGroup().addTo(
          mapInstanceRef.current
        );

        setMapLoaded(true);
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Clear all markers and routes from map
  const clearMapData = () => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    routeLayersRef.current.forEach((layer) => {
      mapInstanceRef.current.removeLayer(layer);
    });
    routeLayersRef.current = [];
  };

  // Add markers to map
  const addMarkersToMap = () => {
    if (!mapInstanceRef.current || !window.L) return;

    clearMapData();

    // Start marker (green)
    if (startCoords.latitude && startCoords.longitude) {
      const startIcon = window.L.divIcon({
        className: "custom-marker",
        html: '<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const startMarker = window.L.marker(
        [startCoords.latitude, startCoords.longitude],
        { icon: startIcon }
      )
        .bindPopup(
          `<b>Start Location</b><br>Lat: ${startCoords.latitude}<br>Lng: ${startCoords.longitude}`
        )
        .addTo(mapInstanceRef.current);
      markersRef.current.push(startMarker);
    }

    // End marker (red)
    if (endCoords.latitude && endCoords.longitude) {
      const endIcon = window.L.divIcon({
        className: "custom-marker",
        html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const endMarker = window.L.marker(
        [endCoords.latitude, endCoords.longitude],
        { icon: endIcon }
      )
        .bindPopup(
          `<b>End Location</b><br>Lat: ${endCoords.latitude}<br>Lng: ${endCoords.longitude}`
        )
        .addTo(mapInstanceRef.current);
      markersRef.current.push(endMarker);
    }

    // Waypoint markers (blue)
    waypoints.forEach((waypoint, index) => {
      if (waypoint.latitude && waypoint.longitude) {
        const waypointIcon = window.L.divIcon({
          className: "custom-marker",
          html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">${
            index + 1
          }</div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const waypointMarker = window.L.marker(
          [waypoint.latitude, waypoint.longitude],
          { icon: waypointIcon }
        )
          .bindPopup(
            `<b>Waypoint ${index + 1}</b><br>Lat: ${
              waypoint.latitude
            }<br>Lng: ${waypoint.longitude}`
          )
          .addTo(mapInstanceRef.current);
        markersRef.current.push(waypointMarker);
      }
    });

    // Fit map to show all markers
    if (markersRef.current.length > 0) {
      const group = new window.L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Draw routes on map
  const drawRoutesOnMap = (routes) => {
    if (!mapInstanceRef.current || !window.L || !routes) return;

    // Clear existing route layers
    routeLayersRef.current.forEach((layer) => {
      mapInstanceRef.current.removeLayer(layer);
    });
    routeLayersRef.current = [];

    routes.forEach((route, index) => {
      const isRecommended =
        routeResults?.ai_recommendations?.recommended_route_index === index;
      const trafficLevel = route.ai_analysis?.avg_traffic_level || 0;

      // Determine route color based on AI score and traffic
      let routeColor;
      if (isRecommended) {
        routeColor = "#10b981"; // Green for recommended
      } else if (trafficLevel > 0.7) {
        routeColor = "#ef4444"; // Red for high traffic
      } else if (trafficLevel > 0.4) {
        routeColor = "#f59e0b"; // Yellow for moderate traffic
      } else {
        routeColor = "#3b82f6"; // Blue for low traffic
      }

      // Create route coordinates
      // Create route coordinates - FIXED: Handle coordinate conversion properly
      let routeCoordinates;
      if (
        route.geometry &&
        route.geometry.coordinates &&
        route.geometry.coordinates.length > 0
      ) {
        // Convert from GeoJSON format [lng, lat] to Leaflet format [lat, lng]
        routeCoordinates = route.geometry.coordinates
          .map((coord) => {
            // Ensure we have valid coordinates
            if (Array.isArray(coord) && coord.length >= 2) {
              return [parseFloat(coord[1]), parseFloat(coord[0])]; // [lat, lng] for Leaflet
            }
            return null;
          })
          .filter((coord) => coord !== null); // Remove invalid coordinates

        // If no valid coordinates, create fallback route
        if (routeCoordinates.length === 0) {
          routeCoordinates = [
            [
              parseFloat(startCoords.latitude),
              parseFloat(startCoords.longitude),
            ],
            [parseFloat(endCoords.latitude), parseFloat(endCoords.longitude)],
          ];
        }
      } else {
        // Fallback: create simple line between start and end
        routeCoordinates = [
          [parseFloat(startCoords.latitude), parseFloat(startCoords.longitude)],
          [parseFloat(endCoords.latitude), parseFloat(endCoords.longitude)],
        ];
      }

      console.log("Route coordinates for map:", routeCoordinates); // Debug log

      // Draw route line
      const routeLine = window.L.polyline(routeCoordinates, {
        color: routeColor,
        weight: isRecommended ? 6 : 4,
        opacity: isRecommended ? 1 : 0.7,
        dashArray: isRecommended ? null : "10, 5",
      }).addTo(mapInstanceRef.current);

      // Add route popup with details
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: ${routeColor};">Route ${
        index + 1
      } ${isRecommended ? "(AI Recommended)" : ""}</h3>
          <div style="font-size: 12px; line-height: 1.4;">
            <strong>Distance:</strong> ${(
              route.summary?.distance / 1000 || 0
            ).toFixed(1)} km<br>
            <strong>Duration:</strong> ${Math.round(
              (route.summary?.duration || 0) / 60
            )} min<br>
            <strong>AI Score:</strong> ${(
              (route.ai_analysis?.ai_score || 0) * 100
            ).toFixed(0)}%<br>
            <strong>Traffic Level:</strong> ${(trafficLevel * 100).toFixed(
              0
            )}%<br>
            <strong>Status:</strong> ${
              route.ai_analysis?.recommendation || "No analysis available"
            }
          </div>
        </div>
      `;

      routeLine.bindPopup(popupContent);
      routeLayersRef.current.push(routeLine);

      // Add traffic indicators along the route
      if (route.traffic_data && route.traffic_data.length > 0) {
        route.traffic_data.forEach((traffic, trafficIndex) => {
          if (traffic.coordinates && traffic.coordinates.length > 0) {
            const [lat, lng] = traffic.coordinates[0];

            let trafficColor;
            if (traffic.traffic_level > 0.7) trafficColor = "#ef4444";
            else if (traffic.traffic_level > 0.4) trafficColor = "#f59e0b";
            else trafficColor = "#10b981";

            const trafficMarker = window.L.circleMarker([lat, lng], {
              radius: 8,
              fillColor: trafficColor,
              color: "white",
              weight: 2,
              fillOpacity: 0.8,
            }).addTo(mapInstanceRef.current);

            trafficMarker.bindPopup(`
              <div style="font-size: 12px;">
                <strong>Traffic Segment</strong><br>
                Level: ${(traffic.traffic_level * 100).toFixed(0)}%<br>
                Speed: ${traffic.speed_kmh.toFixed(0)} km/h<br>
                Status: ${traffic.congestion_level}
              </div>
            `);

            routeLayersRef.current.push(trafficMarker);
          }
        });
      }
    });

    // Fit bounds to show all routes
    if (routeLayersRef.current.length > 0) {
      const group = new window.L.featureGroup([
        ...markersRef.current,
        ...routeLayersRef.current,
      ]);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Update map when coordinates change
  useEffect(() => {
    if (mapLoaded) {
      addMarkersToMap();
    }
  }, [startCoords, endCoords, waypoints, mapLoaded]);

  // Update map when route results change
  useEffect(() => {
    if (mapLoaded && routeResults?.routes) {
      drawRoutesOnMap(routeResults.routes);
    }
  }, [routeResults, mapLoaded]);

  const addWaypoint = () => {
    setWaypoints([...waypoints, { latitude: "", longitude: "" }]);
  };

  const removeWaypoint = (index) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const updateWaypoint = (index, field, value) => {
    const updated = waypoints.map((wp, i) =>
      i === index ? { ...wp, [field]: value } : wp
    );
    setWaypoints(updated);
  };

  const loadSampleRoute = () => {
    setStartCoords(sampleLocations.mumbai);
    setEndCoords(sampleLocations.pune);
    setWaypoints([]);
  };

  // Map click handler to add coordinates
  useEffect(() => {
    if (mapInstanceRef.current) {
      const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;

        if (!startCoords.latitude) {
          setStartCoords({
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
          });
        } else if (!endCoords.latitude) {
          setEndCoords({ latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
        }
      };

      mapInstanceRef.current.on("click", handleMapClick);

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.off("click", handleMapClick);
        }
      };
    }
  }, [startCoords.latitude, endCoords.latitude, mapLoaded]);

  const optimizeRoute = async () => {
    console.log("Starting route optimization...");
    console.log("Start coords:", startCoords);
    console.log("End coords:", endCoords);

    // Validation
    if (
      !startCoords.latitude ||
      !startCoords.longitude ||
      !endCoords.latitude ||
      !endCoords.longitude
    ) {
      alert("Please enter valid start and end coordinates or click on the map");
      return;
    }

    // Convert to numbers and validate
    const startLat = parseFloat(startCoords.latitude);
    const startLng = parseFloat(startCoords.longitude);
    const endLat = parseFloat(endCoords.latitude);
    const endLng = parseFloat(endCoords.longitude);

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      alert("Please enter valid numeric coordinates");
      return;
    }

    if (startLat < -90 || startLat > 90 || endLat < -90 || endLat > 90) {
      alert("Latitude must be between -90 and 90");
      return;
    }

    if (startLng < -180 || startLng > 180 || endLng < -180 || endLng > 180) {
      alert("Longitude must be between -180 and 180");
      return;
    }

    setLoading(true);

    const requestData = {
      start: {
        latitude: startLat,
        longitude: startLng,
      },
      end: {
        latitude: endLat,
        longitude: endLng,
      },
      departure_time: departureTime,
      waypoints: waypoints
        .filter((wp) => wp.latitude && wp.longitude)
        .map((wp) => ({
          latitude: parseFloat(wp.latitude),
          longitude: parseFloat(wp.longitude),
        })),
      vehicle_type: "driving-car",
      avoid_traffic: true,
    };

    console.log("Request data:", requestData);

    try {
      console.log("Sending request to backend...");
      const response = await fetch(`${API_BASE_URL}/optimize-route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData.detail ||
              `HTTP ${response.status}: ${response.statusText}`
          );
        } catch (parseError) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} - ${errorText}`
          );
        }
      }

      const data = await response.json();
      console.log("Success! Received data:", data);
      setRouteResults(data);
    } catch (error) {
      console.error("Error optimizing route:", error);

      // Show user-friendly error message
      if (error.message.includes("fetch")) {
        alert(
          "Cannot connect to backend server. Please make sure the backend is running on http://localhost:8000"
        );
      } else {
        alert(`Error: ${error.message}`);
      }

      // Generate demo data as fallback for development
      console.log("Generating demo data...");
      const mockRoutes = [
        {
          summary: { distance: 150000, duration: 7200 },
          geometry: {
            coordinates: [
              [startLng, startLat],
              [endLng, endLat],
            ],
          },
          ai_analysis: {
            ai_score: 0.85,
            avg_traffic_level: 0.3,
            high_traffic_segments: 2,
            recommendation: "Excellent route - optimal traffic conditions",
            estimated_delay: 300,
          },
          traffic_data: [
            {
              traffic_level: 0.2,
              congestion_level: "light",
              speed_kmh: 55,
              coordinates: [[startLat, startLng]],
            },
            {
              traffic_level: 0.4,
              congestion_level: "moderate",
              speed_kmh: 45,
              coordinates: [[endLat, endLng]],
            },
          ],
        },
        {
          summary: { distance: 165000, duration: 8100 },
          geometry: {
            coordinates: [
              [startLng, startLat],
              [startLng + 0.1, startLat + 0.05],
              [endLng, endLat],
            ],
          },
          ai_analysis: {
            ai_score: 0.65,
            avg_traffic_level: 0.5,
            high_traffic_segments: 4,
            recommendation: "Alternative route - moderate traffic",
            estimated_delay: 600,
          },
          traffic_data: [
            {
              traffic_level: 0.6,
              congestion_level: "moderate",
              speed_kmh: 35,
              coordinates: [[startLat, startLng]],
            },
          ],
        },
      ];

      setRouteResults({
        routes: mockRoutes,
        traffic_analysis: {
          total_segments_analyzed: 15,
          high_traffic_segments: 2,
          average_traffic_level: 0.35,
          traffic_hotspots: [],
        },
        ai_recommendations: {
          recommended_route_index: 0,
          confidence_score: 0.85,
          alternative_routes_available: 1,
          traffic_avoidance_success: true,
          suggested_departure_time: "14:30",
          dynamic_rerouting_enabled: true,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveTraffic = async (lat, lon) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/traffic/live?lat=${lat}&lon=${lon}&radius=1000`
      );
      const data = await response.json();
      setLiveTraffic(data);
    } catch (error) {
      console.error("Error fetching live traffic:", error);
    }
  };

  const getTrafficColor = (level) => {
    if (level < 0.3) return "text-green-600";
    if (level < 0.6) return "text-yellow-600";
    if (level < 0.8) return "text-orange-600";
    return "text-red-600";
  };

  const getTrafficIcon = (level) => {
    if (level < 0.3) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (level < 0.6) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <Map className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">
              Clear Route AI
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Intelligent traffic-aware routing with interactive map visualization
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-6">
                <Route className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Route Configuration
                </h2>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-blue-800">
                💡 Tip: Click on the map to set start/end points or enter
                coordinates manually
              </div>

              {/* Start Coordinates */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1 text-green-600" />
                  Start Location
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Latitude"
                    value={startCoords.latitude}
                    onChange={(e) =>
                      setStartCoords({
                        ...startCoords,
                        latitude: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Longitude"
                    value={startCoords.longitude}
                    onChange={(e) =>
                      setStartCoords({
                        ...startCoords,
                        longitude: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* End Coordinates */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Navigation className="h-4 w-4 inline mr-1 text-red-600" />
                  End Location
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Latitude"
                    value={endCoords.latitude}
                    onChange={(e) =>
                      setEndCoords({ ...endCoords, latitude: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Longitude"
                    value={endCoords.longitude}
                    onChange={(e) =>
                      setEndCoords({ ...endCoords, longitude: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>


              {/* Departure Time */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1 text-purple-600" />
                  Departure Time
                </label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Waypoints */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Waypoints (Optional)
                  </label>
                  <button
                    onClick={addWaypoint}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-xs"
                  >
                    Add
                  </button>
                </div>
                {waypoints.map((waypoint, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="number"
                      placeholder="Lat"
                      value={waypoint.latitude}
                      onChange={(e) =>
                        updateWaypoint(index, "latitude", e.target.value)
                      }
                      className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Lng"
                      value={waypoint.longitude}
                      onChange={(e) =>
                        updateWaypoint(index, "longitude", e.target.value)
                      }
                      className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 text-sm"
                    />
                    <button
                      onClick={() => removeWaypoint(index)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={optimizeRoute}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center text-sm"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-1" />
                      Optimize
                    </>
                  )}
                </button>
                <button
                  onClick={loadSampleRoute}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Sample
                </button>
              </div>

              {/* Map Legend */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center">
                  <Layers className="h-4 w-4 mr-1" />
                  Map Legend
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span>Start Point / Low Traffic</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>End Point / High Traffic</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span>Waypoints / Alternative Routes</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-1 bg-green-500 mr-2"></div>
                    <span>AI Recommended Route</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Panel */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Map className="h-5 w-5 mr-2" />
                    Interactive Route Map
                  </h2>
                  <div className="text-sm opacity-90">
                    {mapLoaded ? "🟢 Map Ready" : "🔄 Loading Map..."}
                  </div>
                </div>
              </div>

              <div
                ref={mapRef}
                className="w-full h-96 xl:h-[600px] bg-gray-100"
                style={{ minHeight: "400px" }}
              >
                {!mapLoaded && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">
                        Loading interactive map...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        {routeResults && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* AI Recommendations */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  AI Analysis
                </h2>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4">
                <h3 className="font-semibold mb-3 text-gray-800">
                  🤖 AI Recommendations
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Confidence Score:</span>
                    <span className="font-semibold text-blue-600">
                      {(
                        routeResults.ai_recommendations.confidence_score * 100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Traffic Avoidance:</span>
                    <span
                      className={`font-semibold ${
                        routeResults.ai_recommendations
                          .traffic_avoidance_success
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {routeResults.ai_recommendations.traffic_avoidance_success
                        ? "Successful"
                        : "Limited"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Alternative Routes:</span>
                    <span className="font-semibold">
                      {
                        routeResults.ai_recommendations
                          .alternative_routes_available
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Suggested Departure:</span>
                    <span className="font-semibold">
                      {routeResults.ai_recommendations.suggested_departure_time}
                    </span>
                  </div>
                </div>
              </div>

              {/* Traffic Analysis */}
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <h3 className="font-semibold mb-3 text-gray-800">
                  🚦 Traffic Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Segments:</span>
                    <p className="font-semibold">
                      {routeResults.traffic_analysis.total_segments_analyzed}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">High Traffic:</span>
                    <p className="font-semibold text-red-600">
                      {routeResults.traffic_analysis.high_traffic_segments}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Traffic:</span>
                    <p
                      className={`font-semibold ${getTrafficColor(
                        routeResults.traffic_analysis.average_traffic_level
                      )}`}
                    >
                      {(
                        routeResults.traffic_analysis.average_traffic_level *
                        100
                      ).toFixed(0)}
                      %
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Hotspots:</span>
                    <p className="font-semibold">
                      {routeResults.traffic_analysis.traffic_hotspots?.length ||
                        0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Comparison */}
            <div className="lg:col-span-2 xl:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <Route className="h-6 w-6 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    Route Comparison
                  </h2>
                </div>

                <div className="space-y-4">
                  {routeResults.routes.map((route, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        index ===
                        routeResults.ai_recommendations.recommended_route_index
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full mr-2 ${
                              index === 0
                                ? "bg-green-500"
                                : index === 1
                                ? "bg-blue-500"
                                : "bg-gray-500"
                            }`}
                          ></div>
                          Route {index + 1}
                          {index ===
                            routeResults.ai_recommendations
                              .recommended_route_index && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                              AI Recommended
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center">
                          {getTrafficIcon(
                            route.ai_analysis?.avg_traffic_level || 0
                          )}
                          <span className="ml-1 text-sm font-medium">
                            AI Score:{" "}
                            {((route.ai_analysis?.ai_score || 0) * 100).toFixed(
                              0
                            )}
                            %
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <span className="text-sm text-gray-600">
                            Distance:
                          </span>
                          <p className="font-semibold">
                            {(route.summary.distance / 1000).toFixed(1)} km
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            Duration:
                          </span>
                          <p className="font-semibold">
                            {Math.round(route.summary.duration / 60)} min
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            Traffic Level:
                          </span>
                          <p
                            className={`font-semibold ${getTrafficColor(
                              route.ai_analysis?.avg_traffic_level || 0
                            )}`}
                          >
                            {(
                              (route.ai_analysis?.avg_traffic_level || 0) * 100
                            ).toFixed(0)}
                            %
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            Estimated Delay:
                          </span>
                          <p className="font-semibold text-orange-600">
                            +
                            {Math.round(
                              (route.ai_analysis?.estimated_delay || 0) / 60
                            )}{" "}
                            min
                          </p>
                        </div>
                      </div>

                      {route.ai_analysis && (
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          <strong>AI Recommendation:</strong>{" "}
                          {route.ai_analysis.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      if (startCoords.latitude && startCoords.longitude) {
                        fetchLiveTraffic(
                          parseFloat(startCoords.latitude),
                          parseFloat(startCoords.longitude)
                        );
                      }
                    }}
                    disabled={!startCoords.latitude || !startCoords.longitude}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center text-sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Check Live Traffic
                  </button>
                  <button
                    onClick={optimizeRoute}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Re-optimize
                  </button>
                  <button
                    onClick={clearMapData}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Clear Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Traffic Data */}
        {liveTraffic && (
          <div className="mt-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-orange-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Live Traffic Data
                </h2>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Location:</span>
                    <p className="font-medium">
                      {liveTraffic.location.lat.toFixed(4)},{" "}
                      {liveTraffic.location.lon.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Radius:</span>
                    <p className="font-medium">{liveTraffic.radius}m</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <p className="font-medium">
                      {new Date(liveTraffic.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {liveTraffic.traffic_data.map((data, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {getTrafficIcon(data.traffic_level)}
                          <span className="ml-2 text-sm font-medium">
                            Segment {idx + 1}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            data.congestion_level === "light"
                              ? "bg-green-100 text-green-800"
                              : data.congestion_level === "moderate"
                              ? "bg-yellow-100 text-yellow-800"
                              : data.congestion_level === "heavy"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {data.congestion_level}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Traffic Level:</span>
                          <span
                            className={`font-medium ${getTrafficColor(
                              data.traffic_level
                            )}`}
                          >
                            {(data.traffic_level * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Speed:</span>
                          <span className="font-medium">
                            {data.speed_kmh.toFixed(0)} km/h
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            🚀 AI Features with Interactive Map
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <Map className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 mb-2">
                Interactive Map
              </h3>
              <p className="text-sm text-gray-600">
                Click to set points, visualize routes, and see real-time traffic
                overlays
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <Route className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 mb-2">
                Visual Route Comparison
              </h3>
              <p className="text-sm text-gray-600">
                Color-coded routes with traffic indicators and AI
                recommendations
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
              <Zap className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 mb-2">
                Real-time Updates
              </h3>
              <p className="text-sm text-gray-600">
                Live traffic data visualization with automatic map updates
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 mb-2">
                AI-Powered Analysis
              </h3>
              <p className="text-sm text-gray-600">
                Smart route scoring with predictive traffic analysis and
                recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Map Controls Help */}
        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
          <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
            <Map className="h-5 w-5 mr-2" />
            Map Controls & Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-indigo-800 mb-1">
                🖱️ Click to Add Points
              </h4>
              <p className="text-gray-600">
                Click anywhere on the map to set start/end locations
                automatically
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-indigo-800 mb-1">
                🛣️ Route Visualization
              </h4>
              <p className="text-gray-600">
                AI-recommended routes shown in solid green, alternatives in
                dashed lines
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-indigo-800 mb-1">
                🚦 Traffic Indicators
              </h4>
              <p className="text-gray-600">
                Colored circles show traffic conditions: green (light), yellow
                (moderate), red (heavy)
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-indigo-800 mb-1">
                📍 Interactive Markers
              </h4>
              <p className="text-gray-600">
                Click on markers and route lines for detailed information popups
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-indigo-800 mb-1">
                🔄 Auto-Zoom
              </h4>
              <p className="text-gray-600">
                Map automatically adjusts to show all routes and markers clearly
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-indigo-800 mb-1">
                ⚡ Real-time Updates
              </h4>
              <p className="text-gray-600">
                Traffic data and route recommendations update automatically
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500">
          <p className="mb-2">
            AI Route Optimizer with Interactive Mapping v1.0
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <span>🗺️ Interactive Maps</span>
            <span>🔄 Real-time Updates</span>
            <span>🤖 AI-Powered</span>
            <span>📱 Mobile Friendly</span>
            <span>⚡ Fast Response</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AIRouteOptimizer;