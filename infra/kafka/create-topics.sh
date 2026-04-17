#!/bin/bash
# Kafka topic creation script
# Usage: ./create-topics.sh <kafka-broker>

KAFKA_BROKER=${1:-localhost:9092}

echo "Creating topics on Kafka broker: $KAFKA_BROKER"

# Function to create topic with retention policy
create_topic() {
    local topic=$1
    local partitions=$2
    local retention=$3
    
    echo "Creating topic: $topic (partitions=$partitions, retention=$retention days)"
    
    kafka-topics --create \
        --bootstrap-server $KAFKA_BROKER \
        --topic $topic \
        --partitions $partitions \
        --replication-factor 1 \
        --config retention.ms=$((retention * 86400000)) \
        --if-not-exists
    
    # Create corresponding DLQ topic
    local dlq_topic="${topic}.dlq"
    echo "Creating DLQ topic: $dlq_topic"
    
    kafka-topics --create \
        --bootstrap-server $KAFKA_BROKER \
        --topic $dlq_topic \
        --partitions 1 \
        --replication-factor 1 \
        --config retention.ms=$((retention * 86400000)) \
        --if-not-exists
}

# Create all topics
create_topic "user.events" 3 7
create_topic "product.events" 6 30
create_topic "inventory.events" 12 7
create_topic "order.events" 12 30
create_topic "payment.events" 6 90
create_topic "cart.events" 6 1

echo "Topics created successfully!"

# List all topics
echo ""
echo "Created topics:"
kafka-topics --list --bootstrap-server $KAFKA_BROKER
