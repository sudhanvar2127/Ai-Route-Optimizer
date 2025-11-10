#!/usr/bin/env python3
"""
AI Route Optimizer - Complete Backend with Real Road Routing
Enhanced version with OSRM integration for real road following
"""


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from enum import Enum
import uvicorn
import logging
import json
import requests
from datetime import datetime
import math
import random
from auth import auth_router
from database import init_db



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)



# ============================================================
# ZONE-BASED TRAFFIC PREDICTION SYSTEM (NEW - ADDED)
# ============================================================


class ZoneType(str, Enum):
    SCHOOL = "school"
    COMMERCIAL = "commercial"
    HOSPITAL = "hospital"
    RESIDENTIAL = "residential"
    OFFICE = "office"
    INDUSTRIAL = "industrial"



# Zone Database - Add your actual zones here
ZONES_DATABASE = [
    {
        "zone_id": "Z001",
        "zone_name": "School Zone - Example School",
        "zone_type": ZoneType.SCHOOL,
        "location": {
            "lat": 12.9716,
            "lng": 77.5946,
            "radius": 500
        },
        "peak_patterns": [
            {
                "start_time": "07:00",
                "end_time": "09:00",
                "congestion_multiplier": 0.8,
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
            },
            {
                "start_time": "15:30",
                "end_time": "17:30",
                "congestion_multiplier": 0.9,
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
            }
        ]
    },
    {
        "zone_id": "Z002",
        "zone_name": "Commercial Hub - Shopping District",
        "zone_type": ZoneType.COMMERCIAL,
        "location": {
            "lat": 12.9716,
            "lng": 77.6000,
            "radius": 800
        },
        "peak_patterns": [
            {
                "start_time": "12:00",
                "end_time": "14:00",
                "congestion_multiplier": 0.6,
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            },
            {
                "start_time": "18:00",
                "end_time": "21:00",
                "congestion_multiplier": 0.7,
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            }
        ]
    },
    {
        "zone_id": "Z003",
        "zone_name": "Hospital Zone - City Hospital",
        "zone_type": ZoneType.HOSPITAL,
        "location": {
            "lat": 12.9800,
            "lng": 77.5946,
            "radius": 600
        },
        "peak_patterns": [
            {
                "start_time": "08:00",
                "end_time": "10:00",
                "congestion_multiplier": 0.65,
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
            },
            {
                "start_time": "17:00",
                "end_time": "19:00",
                "congestion_multiplier": 0.7,
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            }
        ]
    },
    {
        "zone_id": "Z004",
        "zone_name": "Office District - Tech Park",
        "zone_type": ZoneType.OFFICE,
        "location": {
            "lat": 12.9650,
            "lng": 77.6000,
            "radius": 1000
        },
        "peak_patterns": [
            {
                "start_time": "08:00",
                "end_time": "09:30",
                "congestion_multiplier": 0.85,
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
            },
            {
                "start_time": "17:00",
                "end_time": "19:00",
                "congestion_multiplier": 0.9,
                "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
            }
        ]
    }
]



# NEW ZONE FUNCTIONS (ADDED)
def is_point_in_zone(lat: float, lon: float, zone: dict) -> bool:
    """Check if a point is within a zone"""
    zone_lat = zone['location']['lat']
    zone_lng = zone['location']['lng']
    zone_radius = zone['location']['radius']
    distance = calculate_distance(lat, lon, zone_lat, zone_lng)
    return distance <= zone_radius



def get_day_of_week() -> str:
    """Get current day of week"""
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    return days[datetime.now().weekday()]



def is_time_in_range(current_time: str, time_range: tuple) -> bool:
    """Check if current time is within a time range"""
    try:
        current = datetime.strptime(current_time, "%H:%M").time()
        start = datetime.strptime(time_range[0], "%H:%M").time()
        end = datetime.strptime(time_range[1], "%H:%M").time()
        
        if start <= end:
            return start <= current <= end
        else:
            return current >= start or current <= end
    except Exception as e:
        logger.error(f"Time range check error: {e}")
        return False



def calculate_zone_congestion(zone: dict, current_time: str, day_of_week: str) -> float:
    """Calculate congestion level for a zone based on time and day"""
    base_congestion = 0.2
    
    try:
        for pattern in zone.get('peak_patterns', []):
            if day_of_week not in pattern['days']:
                continue
            
            time_range = (pattern['start_time'], pattern['end_time'])
            if is_time_in_range(current_time, time_range):
                return pattern['congestion_multiplier']
        
        return base_congestion
    except Exception as e:
        logger.error(f"Zone congestion calculation error: {e}")
        return base_congestion



def identify_zones_along_route(coordinates: List) -> List[dict]:
    """Identify all zones along a route"""
    zones_found = []
    
    try:
        sample_rate = max(1, len(coordinates) // 20)
        
        for i in range(0, len(coordinates), sample_rate):
            coord = coordinates[i]
            lon, lat = coord[0], coord[1]
            
            for zone in ZONES_DATABASE:
                if is_point_in_zone(lat, lon, zone):
                    if not any(z['zone_id'] == zone['zone_id'] for z in zones_found):
                        zones_found.append(zone)
        
        logger.info(f"Found {len(zones_found)} zones along route")
        return zones_found
        
    except Exception as e:
        logger.error(f"Zone identification error: {e}")
        return []



def predict_zone_based_traffic(coordinates: List, departure_time: Optional[str] = None) -> dict:
    """Predict traffic based on zones and time"""
    
    if not departure_time:
        departure_time = datetime.now().strftime("%H:%M")
    
    day_of_week = get_day_of_week()
    zones_along_route = identify_zones_along_route(coordinates)
    
    high_traffic_zones = []
    zone_warnings = []
    
    for zone in zones_along_route:
        congestion_level = calculate_zone_congestion(zone, departure_time, day_of_week)
        
        if congestion_level >= 0.6:
            high_traffic_zones.append({
                'zone_id': zone['zone_id'],
                'zone_name': zone['zone_name'],
                'zone_type': zone['zone_type'],
                'congestion_level': round(congestion_level, 3),
                'location': zone['location']
            })
            
            zone_warnings.append(
                f"High traffic expected near {zone['zone_name']} "
                f"({zone['zone_type']}) at {departure_time}"
            )
    
    if zones_along_route:
        avg_zone_congestion = sum(
            calculate_zone_congestion(z, departure_time, day_of_week) 
            for z in zones_along_route
        ) / len(zones_along_route)
    else:
        avg_zone_congestion = 0.2
    
    return {
        'zones_detected': len(zones_along_route),
        'high_traffic_zones': high_traffic_zones,
        'zone_warnings': zone_warnings,
        'avg_zone_congestion': round(avg_zone_congestion, 3),
        'departure_time': departure_time,
        'day_of_week': day_of_week,
        'all_zones': zones_along_route
    }



def apply_zone_congestion_to_traffic_data(traffic_data: List[dict], zone_predictions: dict) -> List[dict]:
    """Apply zone-based congestion predictions to traffic data"""
    
    high_traffic_zone_locations = [
        (z['location']['lat'], z['location']['lng']) 
        for z in zone_predictions.get('high_traffic_zones', [])
    ]
    
    for segment in traffic_data:
        if not segment.get('coordinates') or not segment['coordinates'][0]:
            continue
            
        seg_lat, seg_lon = segment['coordinates'][0]
        
        for zone_lat, zone_lon in high_traffic_zone_locations:
            distance = calculate_distance(seg_lat, seg_lon, zone_lat, zone_lon)
            
            if distance <= 1000:
                segment['traffic_level'] = min(0.95, segment['traffic_level'] * 1.4)
                segment['congestion_level'] = "severe" if segment['traffic_level'] > 0.8 else "heavy"
                segment['speed_kmh'] = max(10, segment['speed_kmh'] * 0.6)
                segment['zone_affected'] = True
                break
    
    return traffic_data



# Create FastAPI app
app = FastAPI(
    title="AI Route Optimizer with Real Road Routing", 
    version="2.0.0",
    description="Enhanced version with real road routing using OSRM"
)



# CORS middleware - allow everything for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



init_db()
app.include_router(auth_router)



def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula"""
    try:
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r * 1000  # Convert to meters
    except Exception as e:
        logger.error(f"Distance calculation error: {e}")
        # Fallback to simple calculation
        lat_diff = abs(lat2 - lat1) * 111000
        lon_diff = abs(lon2 - lon1) * 85000
        return math.sqrt(lat_diff**2 + lon_diff**2)



def generate_traffic_data(start_lat, start_lon, end_lat, end_lon, num_segments=5):
    """Generate realistic traffic data (legacy function for fallback)"""
    traffic_data = []
    
    try:
        for i in range(num_segments):
            progress = i / max(1, num_segments - 1)
            
            # Interpolate coordinates
            lat = start_lat + progress * (end_lat - start_lat)
            lon = start_lon + progress * (end_lon - start_lon)
            
            # Generate random but realistic traffic data
            traffic_level = random.uniform(0.1, 0.9)
            base_speed = 60  # km/h
            speed = base_speed * (1 - traffic_level * 0.6)  # Reduce speed based on traffic
            
            # Classify congestion
            if traffic_level < 0.3:
                congestion = "light"
            elif traffic_level < 0.6:
                congestion = "moderate"
            elif traffic_level < 0.8:
                congestion = "heavy"
            else:
                congestion = "severe"
            
            traffic_data.append({
                "segment_id": f"segment_{i}",
                "traffic_level": round(traffic_level, 3),
                "speed_kmh": round(speed, 1),
                "congestion_level": congestion,
                "coordinates": [[lat, lon]]
            })
            
    except Exception as e:
        logger.error(f"Traffic data generation error: {e}")
        # Return minimal data if there's an error
        traffic_data = [{
            "segment_id": "segment_0",
            "traffic_level": 0.3,
            "speed_kmh": 50.0,
            "congestion_level": "light",
            "coordinates": [[start_lat, start_lon]]
        }]
    
    return traffic_data



def calculate_ai_score(distance, duration, traffic_level):
    """Calculate AI score for route"""
    try:
        # Normalize factors (0-1 scale)
        distance_score = 1.0 / (1.0 + distance / 100000)  # Prefer shorter routes
        time_score = 1.0 / (1.0 + duration / 10800)  # Prefer faster routes (3 hours max)
        traffic_score = 1.0 - traffic_level  # Prefer less traffic
        
        # Weighted average
        ai_score = (distance_score * 0.3 + time_score * 0.4 + traffic_score * 0.3)
        return min(1.0, max(0.0, ai_score))  # Clamp between 0 and 1
        
    except Exception as e:
        logger.error(f"AI score calculation error: {e}")
        return 0.5  # Default score



# NEW: Real road routing functions
async def get_osrm_route(start_lat, start_lon, end_lat, end_lon, waypoints=None):
    """Get real route following roads using OSRM (free, no API key needed)"""
    try:
        # Build coordinate string for OSRM: lon,lat format
        coords = f"{start_lon},{start_lat}"
        
        # Add waypoints if provided
        if waypoints:
            for wp in waypoints:
                if wp.get('latitude') and wp.get('longitude'):
                    coords += f";{wp['longitude']},{wp['latitude']}"
        
        coords += f";{end_lon},{end_lat}"
        
        # OSRM API call (free public server)
        url = f"http://router.project-osrm.org/route/v1/driving/{coords}"
        params = {
            'overview': 'full',
            'geometries': 'geojson',
            'steps': 'false',
            'alternatives': 'true'  # Get alternative routes
        }
        
        logger.info(f"Calling OSRM API: {url}")
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            routes = data.get('routes', [])
            
            if routes:
                # Return the first (best) route
                route = routes[0]
                return {
                    'coordinates': route['geometry']['coordinates'],
                    'distance': route['distance'],
                    'duration': route['duration'],
                    'success': True,
                    'alternatives': routes[1:] if len(routes) > 1 else []  # Additional routes
                }
            
    except Exception as e:
        logger.error(f"OSRM API error: {e}")
    
    # Fallback to straight line if API fails
    logger.warning("Using fallback straight-line route")
    return {
        'coordinates': [[start_lon, start_lat], [end_lon, end_lat]],
        'distance': calculate_distance(start_lat, start_lon, end_lat, end_lon),
        'duration': calculate_distance(start_lat, start_lon, end_lat, end_lon) / 15,
        'success': False,
        'alternatives': []
    }



def generate_traffic_data_along_route(coordinates, num_segments=8):
    """Generate traffic data along actual route coordinates"""
    if not coordinates or len(coordinates) < 2:
        return []
    
    traffic_data = []
    
    try:
        # Sample points along the route
        num_segments = min(num_segments, len(coordinates) // 2)
        
        for i in range(num_segments):
            # Get coordinate index along the route
            idx = int(i * len(coordinates) / max(1, num_segments - 1))
            idx = min(idx, len(coordinates) - 1)
            
            coord = coordinates[idx]
            
            # Generate realistic traffic data
            traffic_level = random.uniform(0.1, 0.8)
            base_speed = 60  # km/h
            speed = base_speed * (1 - traffic_level * 0.6)
            
            # Classify congestion
            if traffic_level < 0.3:
                congestion = "light"
            elif traffic_level < 0.6:
                congestion = "moderate"
            elif traffic_level < 0.8:
                congestion = "heavy"
            else:
                congestion = "severe"
            
            traffic_data.append({
                "segment_id": f"segment_{i}",
                "traffic_level": round(traffic_level, 3),
                "speed_kmh": round(speed, 1),
                "congestion_level": congestion,
                "coordinates": [[coord[1], coord[0]]]  # Convert to [lat, lon]
            })
            
    except Exception as e:
        logger.error(f"Traffic data generation error: {e}")
        # Return basic traffic data
        traffic_data = [{
            "segment_id": "segment_0",
            "traffic_level": 0.3,
            "speed_kmh": 50.0,
            "congestion_level": "light",
            "coordinates": [[coordinates[0][1], coordinates[0][0]]] if coordinates else [[0, 0]]
        }]
    
    return traffic_data



def generate_alternative_waypoints(start_lat, start_lon, end_lat, end_lon):
    """Generate alternative waypoints for different route"""
    mid_lat = (start_lat + end_lat) / 2
    mid_lon = (start_lon + end_lon) / 2
    
    # Create waypoint offset from direct path
    offset_lat = random.uniform(-0.02, 0.02)
    offset_lon = random.uniform(-0.02, 0.02)
    
    return [{
        'latitude': mid_lat + offset_lat,
        'longitude': mid_lon + offset_lon
    }]



@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Route Optimizer API - Enhanced with Real Roads",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0-enhanced",
        "features": ["Real road routing", "OSRM integration", "Multiple alternatives", "Traffic simulation", "Zone-based prediction"]
    }



@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {
            "api": "ok",
            "logging": "ok",
            "calculations": "ok",
            "osrm_routing": "available",
            "zone_system": "active",
            "total_zones": len(ZONES_DATABASE)
        }
    }



@app.post("/optimize-route")
async def optimize_route(request: dict):
    """Main route optimization endpoint with real road routing"""
    
    # Log the incoming request
    logger.info("=== New Route Optimization Request ===")
    logger.info(f"Request data: {json.dumps(request, indent=2)}")
    
    try:
        # Extract and validate coordinates
        start_data = request.get("start", {})
        end_data = request.get("end", {})
        
        # Handle both string and number inputs
        start_lat = float(start_data.get("latitude", 0))
        start_lon = float(start_data.get("longitude", 0))
        end_lat = float(end_data.get("latitude", 0))
        end_lon = float(end_data.get("longitude", 0))
        
        # NEW: Get departure time from request
        departure_time = request.get("departure_time", datetime.now().strftime("%H:%M"))
        
        logger.info(f"Coordinates: ({start_lat}, {start_lon}) -> ({end_lat}, {end_lon})")
        logger.info(f"Departure time: {departure_time}")
        
        # Basic validation
        if start_lat == 0 and start_lon == 0:
            raise HTTPException(status_code=400, detail="Start coordinates are required")
        if end_lat == 0 and end_lon == 0:
            raise HTTPException(status_code=400, detail="End coordinates are required")
        
        # Validate ranges
        if not (-90 <= start_lat <= 90) or not (-90 <= end_lat <= 90):
            raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
        if not (-180 <= start_lon <= 180) or not (-180 <= end_lon <= 180):
            raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
        
        # Get waypoints from request
        waypoints = request.get("waypoints", [])
        logger.info(f"Waypoints: {waypoints}")
        
        routes = []
        
        # Route 1: Direct route following roads
        logger.info("Getting direct route from OSRM...")
        direct_route = await get_osrm_route(start_lat, start_lon, end_lat, end_lon, waypoints)
        
        # NEW: Apply zone-based prediction
        zone_predictions = predict_zone_based_traffic(direct_route['coordinates'], departure_time)
        
        direct_traffic_data = generate_traffic_data_along_route(direct_route['coordinates'])
        
        # NEW: Apply zone congestion to traffic data
        direct_traffic_data = apply_zone_congestion_to_traffic_data(direct_traffic_data, zone_predictions)
        
        direct_avg_traffic = sum(td["traffic_level"] for td in direct_traffic_data) / max(1, len(direct_traffic_data))
        direct_ai_score = calculate_ai_score(direct_route['distance'], direct_route['duration'], direct_avg_traffic)
        
        route1 = {
            "summary": {
                "distance": round(direct_route['distance'], 0),
                "duration": round(direct_route['duration'], 0)
            },
            "geometry": {
                "coordinates": direct_route['coordinates']
            },
            "ai_analysis": {
                "ai_score": round(direct_ai_score, 3),
                "avg_traffic_level": round(direct_avg_traffic, 3),
                "high_traffic_segments": sum(1 for td in direct_traffic_data if td["traffic_level"] > 0.7),
                "recommendation": f"Direct route following roads {'(Real API)' if direct_route['success'] else '(Fallback)'}",
                "estimated_delay": round(direct_avg_traffic * direct_route['duration'] * 0.2, 0),
                # NEW: Zone-based info
                "zones_detected": zone_predictions['zones_detected'],
                "zone_warnings": zone_predictions['zone_warnings']
            },
            "traffic_data": direct_traffic_data,
            # NEW: Zone predictions
            "zone_predictions": zone_predictions
        }
        routes.append(route1)
        
        # Route 2: Alternative route with different waypoints
        alt_waypoints = generate_alternative_waypoints(start_lat, start_lon, end_lat, end_lon)
        logger.info("Getting alternative route from OSRM...")
        alt_route = await get_osrm_route(start_lat, start_lon, end_lat, end_lon, alt_waypoints)
        
        # NEW: Apply zone-based prediction
        alt_zone_predictions = predict_zone_based_traffic(alt_route['coordinates'], departure_time)
        
        alt_traffic_data = generate_traffic_data_along_route(alt_route['coordinates'])
        
        # NEW: Apply zone congestion
        alt_traffic_data = apply_zone_congestion_to_traffic_data(alt_traffic_data, alt_zone_predictions)
        
        alt_avg_traffic = sum(td["traffic_level"] for td in alt_traffic_data) / max(1, len(alt_traffic_data))
        alt_ai_score = calculate_ai_score(alt_route['distance'], alt_route['duration'], alt_avg_traffic)
        
        route2 = {
            "summary": {
                "distance": round(alt_route['distance'], 0),
                "duration": round(alt_route['duration'], 0)
            },
            "geometry": {
                "coordinates": alt_route['coordinates']
            },
            "ai_analysis": {
                "ai_score": round(alt_ai_score, 3),
                "avg_traffic_level": round(alt_avg_traffic, 3),
                "high_traffic_segments": sum(1 for td in alt_traffic_data if td["traffic_level"] > 0.7),
                "recommendation": f"Alternative route via waypoint {'(Real API)' if alt_route['success'] else '(Fallback)'}",
                "estimated_delay": round(alt_avg_traffic * alt_route['duration'] * 0.25, 0),
                # NEW: Zone-based info
                "zones_detected": alt_zone_predictions['zones_detected'],
                "zone_warnings": alt_zone_predictions['zone_warnings']
            },
            "traffic_data": alt_traffic_data,
            # NEW: Zone predictions
            "zone_predictions": alt_zone_predictions
        }
        routes.append(route2)
        
        # If OSRM provided alternatives, add them too
        for i, alt in enumerate(direct_route.get('alternatives', [])[:1]):  # Add max 1 more alternative
            alt_zone_pred = predict_zone_based_traffic(alt['geometry']['coordinates'], departure_time)
            alt_traffic_data = generate_traffic_data_along_route(alt['geometry']['coordinates'])
            alt_traffic_data = apply_zone_congestion_to_traffic_data(alt_traffic_data, alt_zone_pred)
            alt_avg_traffic = sum(td["traffic_level"] for td in alt_traffic_data) / max(1, len(alt_traffic_data))
            alt_ai_score = calculate_ai_score(alt['distance'], alt['duration'], alt_avg_traffic)
            
            route_alt = {
                "summary": {
                    "distance": round(alt['distance'], 0),
                    "duration": round(alt['duration'], 0)
                },
                "geometry": {
                    "coordinates": alt['geometry']['coordinates']
                },
                "ai_analysis": {
                    "ai_score": round(alt_ai_score, 3),
                    "avg_traffic_level": round(alt_avg_traffic, 3),
                    "high_traffic_segments": sum(1 for td in alt_traffic_data if td["traffic_level"] > 0.7),
                    "recommendation": f"OSRM alternative route {i+1}",
                    "estimated_delay": round(alt_avg_traffic * alt['duration'] * 0.3, 0),
                    "zones_detected": alt_zone_pred['zones_detected'],
                    "zone_warnings": alt_zone_pred['zone_warnings']
                },
                "traffic_data": alt_traffic_data,
                "zone_predictions": alt_zone_pred
            }
            routes.append(route_alt)
        
        # Determine best route based on AI score
        best_route_index = 0
        best_score = routes[0]["ai_analysis"]["ai_score"]
        
        for i, route in enumerate(routes):
            if route["ai_analysis"]["ai_score"] > best_score:
                best_route_index = i
                best_score = route["ai_analysis"]["ai_score"]
        
        best_route = routes[best_route_index]
        
        # Compile traffic analysis
        all_traffic_data = []
        for route in routes:
            all_traffic_data.extend(route["traffic_data"])
        
        traffic_analysis = {
            "total_segments_analyzed": len(all_traffic_data),
            "high_traffic_segments": sum(1 for td in all_traffic_data if td["traffic_level"] > 0.7),
            "average_traffic_level": round(sum(td["traffic_level"] for td in all_traffic_data) / max(1, len(all_traffic_data)), 3),
            "traffic_hotspots": [td for td in all_traffic_data if td["traffic_level"] > 0.8],
            # NEW: Zone-based traffic analysis
            "zone_based_analysis": {
                "total_zones_detected": best_route["zone_predictions"]["zones_detected"],
                "high_traffic_zones": len(best_route["zone_predictions"]["high_traffic_zones"]),
                "zone_warnings": best_route["zone_predictions"]["zone_warnings"]
            }
        }
        
        # AI recommendations
        ai_recommendations = {
            "recommended_route_index": best_route_index,
            "confidence_score": round(best_route["ai_analysis"]["ai_score"], 3),
            "alternative_routes_available": len(routes) - 1,
            "traffic_avoidance_success": best_route["ai_analysis"]["avg_traffic_level"] < 0.6,
            "suggested_departure_time": departure_time,
            "dynamic_rerouting_enabled": True,
            # NEW: Zone-based recommendations
            "zone_based_warnings": best_route["zone_predictions"]["zone_warnings"],
            "avoid_high_traffic_zones": len(best_route["zone_predictions"]["high_traffic_zones"]) > 0
        }
        
        # Build response
        response = {
            "routes": routes,
            "traffic_analysis": traffic_analysis,
            "ai_recommendations": ai_recommendations,
            "estimated_time": best_route["summary"]["duration"],
            "distance": best_route["summary"]["distance"]
        }
        
        logger.info("Route optimization completed successfully")
        logger.info(f"Generated {len(routes)} routes, best route index: {best_route_index}")
        logger.info(f"Using real road data: {direct_route['success']}")
        logger.info(f"Zone predictions: {best_route['zone_predictions']['zones_detected']} zones detected")
        
        return response
        
    except HTTPException as he:
        logger.error(f"HTTP Exception: {he.detail}")
        raise he
    except ValueError as ve:
        logger.error(f"Value error: {ve}")
        raise HTTPException(status_code=400, detail=f"Invalid input data: {str(ve)}")
    except Exception as e:
        logger.error(f"Unexpected error in route optimization: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")



@app.get("/traffic/live")
async def get_live_traffic(lat: float, lon: float, radius: int = 1000):
    """Get live traffic data"""
    try:
        logger.info(f"Live traffic request: lat={lat}, lon={lon}, radius={radius}")
        
        # Generate mock traffic data around the location
        traffic_data = generate_traffic_data(lat, lon, lat + 0.01, lon + 0.01, 4)
        
        response = {
            "location": {"lat": lat, "lon": lon},
            "radius": radius,
            "traffic_data": traffic_data,
            "timestamp": datetime.now().isoformat()
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Live traffic error: {e}")
        raise HTTPException(status_code=500, detail=f"Traffic data error: {str(e)}")



# NEW ZONE ENDPOINTS (ADDED)
@app.get("/zones/all")
async def get_all_zones():
    """Get all registered zones"""
    try:
        zones_list = []
        for zone in ZONES_DATABASE:
            zones_list.append({
                "zone_id": zone['zone_id'],
                "zone_name": zone['zone_name'],
                "zone_type": zone['zone_type'],
                "location": zone['location'],
                "peak_patterns_count": len(zone['peak_patterns'])
            })
        
        return {
            "total_zones": len(zones_list),
            "zones": zones_list,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching zones: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/zones/nearby")
async def get_nearby_zones(lat: float, lon: float, radius: int = 2000):
    """Get zones near a specific location"""
    try:
        nearby_zones = []
        
        for zone in ZONES_DATABASE:
            distance = calculate_distance(
                lat, lon,
                zone['location']['lat'],
                zone['location']['lng']
            )
            
            if distance <= radius:
                nearby_zones.append({
                    "zone_id": zone['zone_id'],
                    "zone_name": zone['zone_name'],
                    "zone_type": zone['zone_type'],
                    "location": zone['location'],
                    "distance_meters": round(distance, 2)
                })
        
        return {
            "search_location": {"lat": lat, "lon": lon},
            "search_radius": radius,
            "zones_found": len(nearby_zones),
            "zones": sorted(nearby_zones, key=lambda x: x['distance_meters']),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error finding nearby zones: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/test")
async def test_endpoint(data: dict):
    """Simple test endpoint"""
    logger.info(f"Test endpoint called with: {data}")
    return {
        "message": "Test endpoint working",
        "received_data": data,
        "timestamp": datetime.now().isoformat()
    }



# Error handler for 500 errors
@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {
        "error": "Internal server error",
        "message": "Something went wrong on the server",
        "timestamp": datetime.now().isoformat()
    }



if __name__ == "__main__":
    print("🚀 AI Route Optimizer - Enhanced Backend Starting...")
    print("=" * 60)
    print("📍 Server URL: http://localhost:8000")
    print("📋 API Docs: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")
    print("🧪 Test Endpoint: http://localhost:8000/test")
    print("🗺️  Real Road Routing: ENABLED (OSRM)")
    print("🛣️  Features: Real roads, waypoints, alternatives, zone prediction")
    print(f"🎯 Total Zones: {len(ZONES_DATABASE)}")
    print("💡 Press Ctrl+C to stop")
    print("=" * 60)
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
            access_log=True
        )
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure port 8000 is not in use")
        print("2. Try: netstat -an | grep 8000")
        print("3. Or use a different port: uvicorn main:app --port 8001")
        print("4. Install requirements: pip install fastapi uvicorn requests")