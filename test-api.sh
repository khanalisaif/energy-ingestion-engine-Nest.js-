#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/v1"

echo -e "${YELLOW}=== Energy Ingestion Engine Test Suite ===${NC}\n"

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing: ${description}${NC}"
    
    if [ "$method" == "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    else
        response=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}${endpoint}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (HTTP ${http_code})${NC}"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (HTTP ${http_code})${NC}"
        echo "$body"
    fi
    echo ""
}

# Wait for service to be ready
echo -e "${YELLOW}Waiting for service to start...${NC}"
sleep 5

# Test 1: Ingest Meter Telemetry
test_endpoint "POST" "/ingestion/meter" '{
  "meterId": "METER_001",
  "kwhConsumedAc": 45.7823,
  "voltage": 230.5,
  "timestamp": "2025-02-08T10:30:00Z"
}' "Ingest Meter Telemetry"

# Test 2: Ingest Vehicle Telemetry
test_endpoint "POST" "/ingestion/vehicle" '{
  "vehicleId": "VEHICLE_001",
  "soc": 75.5,
  "kwhDeliveredDc": 38.9234,
  "batteryTemp": 32.4,
  "timestamp": "2025-02-08T10:30:00Z"
}' "Ingest Vehicle Telemetry"

# Test 3: Bulk Meter Ingestion
test_endpoint "POST" "/ingestion/meter/bulk" '[
  {
    "meterId": "METER_001",
    "kwhConsumedAc": 50.1234,
    "voltage": 231.0,
    "timestamp": "2025-02-08T11:00:00Z"
  },
  {
    "meterId": "METER_002",
    "kwhConsumedAc": 48.5678,
    "voltage": 229.8,
    "timestamp": "2025-02-08T11:00:00Z"
  }
]' "Bulk Meter Ingestion"

# Test 4: Bulk Vehicle Ingestion
test_endpoint "POST" "/ingestion/vehicle/bulk" '[
  {
    "vehicleId": "VEHICLE_001",
    "soc": 78.2,
    "kwhDeliveredDc": 42.5432,
    "batteryTemp": 33.1,
    "timestamp": "2025-02-08T11:00:00Z"
  },
  {
    "vehicleId": "VEHICLE_002",
    "soc": 65.8,
    "kwhDeliveredDc": 41.2345,
    "batteryTemp": 31.7,
    "timestamp": "2025-02-08T11:00:00Z"
  }
]' "Bulk Vehicle Ingestion"

# Add more test data for analytics
echo -e "${YELLOW}Adding test data for analytics...${NC}"
for i in {1..10}; do
    timestamp=$(date -u -d "+$i minutes" +"%Y-%m-%dT%H:%M:%SZ")
    
    curl -s -X POST "${API_URL}/ingestion/meter" \
        -H "Content-Type: application/json" \
        -d "{
            \"meterId\": \"METER_001\",
            \"kwhConsumedAc\": $((45 + i)).$(($RANDOM % 10000)),
            \"voltage\": 230.$((RANDOM % 100)),
            \"timestamp\": \"$timestamp\"
        }" > /dev/null
    
    curl -s -X POST "${API_URL}/ingestion/vehicle" \
        -H "Content-Type: application/json" \
        -d "{
            \"vehicleId\": \"VEHICLE_001\",
            \"soc\": $((70 + i % 20)).$(($RANDOM % 100)),
            \"kwhDeliveredDc\": $((40 + i)).$(($RANDOM % 10000)),
            \"batteryTemp\": 32.$((RANDOM % 100)),
            \"timestamp\": \"$timestamp\"
        }" > /dev/null
done
echo -e "${GREEN}✓ Test data added${NC}\n"

# Test 5: Get Performance Analytics
test_endpoint "GET" "/analytics/performance/VEHICLE_001" "" "Get 24-Hour Performance Analytics"

# Test 6: Get Current Status
test_endpoint "GET" "/analytics/status/VEHICLE_001" "" "Get Current Vehicle Status"

# Test 7: Get Fleet Summary
test_endpoint "GET" "/analytics/fleet/summary" "" "Get Fleet Summary"

echo -e "${GREEN}=== Test Suite Completed ===${NC}"
