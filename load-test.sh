#!/bin/bash

# Load Test Data Generator
# Simulates 1000 devices sending telemetry every minute

API_URL="http://localhost:3000/v1"
NUM_DEVICES=1000
DURATION_MINUTES=5

echo "🚀 Load Test: Simulating $NUM_DEVICES devices for $DURATION_MINUTES minutes"
echo "   Total expected requests: $((NUM_DEVICES * DURATION_MINUTES * 2)) (meter + vehicle)"
echo ""

generate_meter_data() {
    local device_id=$1
    local timestamp=$2
    local kwh=$(awk -v min=40 -v max=60 'BEGIN{srand(); print min+rand()*(max-min)}')
    local voltage=$(awk -v min=220 -v max=240 'BEGIN{srand(); print min+rand()*(max-min)}')
    
    echo "{
        \"meterId\": \"METER_$(printf "%04d" $device_id)\",
        \"kwhConsumedAc\": $kwh,
        \"voltage\": $voltage,
        \"timestamp\": \"$timestamp\"
    }"
}

generate_vehicle_data() {
    local device_id=$1
    local timestamp=$2
    local soc=$(awk -v min=60 -v max=90 'BEGIN{srand(); print min+rand()*(max-min)}')
    local kwh_dc=$(awk -v min=35 -v max=55 'BEGIN{srand(); print min+rand()*(max-min)}')
    local temp=$(awk -v min=25 -v max=40 'BEGIN{srand(); print min+rand()*(max-min)}')
    
    echo "{
        \"vehicleId\": \"VEHICLE_$(printf "%04d" $device_id)\",
        \"soc\": $soc,
        \"kwhDeliveredDc\": $kwh_dc,
        \"batteryTemp\": $temp,
        \"timestamp\": \"$timestamp\"
    }"
}

send_telemetry() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local success_count=0
    local fail_count=0
    
    echo "📡 Sending telemetry batch at $timestamp"
    
    # Create batch arrays
    meter_batch="["
    vehicle_batch="["
    
    for ((i=1; i<=NUM_DEVICES; i++)); do
        meter_data=$(generate_meter_data $i "$timestamp")
        vehicle_data=$(generate_vehicle_data $i "$timestamp")
        
        meter_batch="$meter_batch$meter_data"
        vehicle_batch="$vehicle_batch$vehicle_data"
        
        if [ $i -lt $NUM_DEVICES ]; then
            meter_batch="$meter_batch,"
            vehicle_batch="$vehicle_batch,"
        fi
    done
    
    meter_batch="$meter_batch]"
    vehicle_batch="$vehicle_batch]"
    
    # Send meter batch
    meter_response=$(curl -s -w "%{http_code}" -X POST "${API_URL}/ingestion/meter/bulk" \
        -H "Content-Type: application/json" \
        -d "$meter_batch" -o /dev/null)
    
    # Send vehicle batch
    vehicle_response=$(curl -s -w "%{http_code}" -X POST "${API_URL}/ingestion/vehicle/bulk" \
        -H "Content-Type: application/json" \
        -d "$vehicle_batch" -o /dev/null)
    
    if [ "$meter_response" -eq 201 ]; then
        ((success_count++))
    else
        ((fail_count++))
        echo "   ❌ Meter batch failed: HTTP $meter_response"
    fi
    
    if [ "$vehicle_response" -eq 201 ]; then
        ((success_count++))
    else
        ((fail_count++))
        echo "   ❌ Vehicle batch failed: HTTP $vehicle_response"
    fi
    
    echo "   ✅ Success: $success_count batches | ❌ Failed: $fail_count batches"
    echo ""
}

# Main loop
for ((minute=1; minute<=DURATION_MINUTES; minute++)); do
    echo "=== Minute $minute/$DURATION_MINUTES ==="
    send_telemetry
    
    if [ $minute -lt $DURATION_MINUTES ]; then
        echo "⏳ Waiting 60 seconds..."
        sleep 60
    fi
done

echo "✅ Load test completed!"
echo ""
echo "📊 You can now check analytics:"
echo "   curl $API_URL/analytics/fleet/summary"
echo "   curl $API_URL/analytics/performance/VEHICLE_0001"
