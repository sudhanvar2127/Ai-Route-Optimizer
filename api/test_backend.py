#!/usr/bin/env python3
"""
Test script for AI Route Optimizer Backend
Run this to test if your backend is working correctly
"""

import requests
import json
import sys

# Backend URL
BASE_URL = "http://localhost:8000"

def test_connection():
    """Test basic connection to backend"""
    try:
        print("🔄 Testing backend connection...")
        response = requests.get(f"{BASE_URL}/")
        
        if response.status_code == 200:
            print("✅ Backend connection successful!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Backend connection failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error connecting to backend: {e}")
        return False

def test_optimize_route():
    """Test route optimization endpoint"""
    try:
        print("\n🔄 Testing route optimization...")
        
        # Test data - Mumbai to Pune
        test_data = {
            "start": {
                "latitude": 19.0760,
                "longitude": 72.8777
            },
            "end": {
                "latitude": 18.5204,
                "longitude": 73.8567
            },
            "waypoints": [],
            "vehicle_type": "driving-car",
            "avoid_traffic": True
        }
        
        print(f"   Sending request with data: {json.dumps(test_data, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/optimize-route",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Response status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Route optimization successful!")
            data = response.json()
            print(f"   Found {len(data.get('routes', []))} routes")
            print(f"   AI confidence: {data.get('ai_recommendations', {}).get('confidence_score', 'N/A')}")
            return True
        else:
            print(f"❌ Route optimization failed!")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing route optimization: {e}")
        return False

def test_cors():
    """Test CORS headers"""
    try:
        print("\n🔄 Testing CORS headers...")
        
        # Test OPTIONS request (preflight)
        response = requests.options(
            f"{BASE_URL}/optimize-route",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        print(f"   OPTIONS response status: {response.status_code}")
        print(f"   CORS headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ CORS preflight successful!")
            return True
        else:
            print(f"❌ CORS preflight failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing CORS: {e}")
        return False

def test_invalid_data():
    """Test with invalid data to check error handling"""
    try:
        print("\n🔄 Testing error handling...")
        
        # Test with invalid coordinates
        invalid_data = {
            "start": {
                "latitude": 200,  # Invalid latitude
                "longitude": 72.8777
            },
            "end": {
                "latitude": 18.5204,
                "longitude": 73.8567
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/optimize-route",
            json=invalid_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 400:
            print("✅ Error handling works correctly!")
            print(f"   Error message: {response.json().get('detail', 'No detail')}")
            return True
        else:
            print(f"❌ Expected 400 error, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing error handling: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 AI Route Optimizer Backend Test Suite")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 4
    
    # Run tests
    if test_connection():
        tests_passed += 1
    
    if test_cors():
        tests_passed += 1
    
    if test_optimize_route():
        tests_passed += 1
        
    if test_invalid_data():
        tests_passed += 1
    
    # Summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Your backend is working correctly.")
        print("\n💡 Next steps:")
        print("   1. Make sure your React frontend is running on http://localhost:3000")
        print("   2. Try the route optimization in the web interface")
        print("   3. Check browser console for any remaining errors")
    else:
        print(f"⚠️  {total_tests - tests_passed} tests failed. Check the error messages above.")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure FastAPI server is running: python main.py")
        print("   2. Check if port 8000 is available")
        print("   3. Verify CORS middleware is properly configured")
        print("   4. Check server logs for detailed error messages")

if __name__ == "__main__":
    main()