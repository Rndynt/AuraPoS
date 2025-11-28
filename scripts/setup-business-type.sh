#!/bin/bash

# AuraPOS Business Type Setup Script
# Usage: ./scripts/setup-business-type.sh <business_type>
# Example: ./scripts/setup-business-type.sh LAUNDRY

set -e

BUSINESS_TYPE=${1:-"CAFE_RESTAURANT"}

echo "=============================================="
echo "  AuraPOS Business Type Setup"
echo "=============================================="
echo ""
echo "Business Type: $BUSINESS_TYPE"
echo ""

# Validate business type
case $BUSINESS_TYPE in
  CAFE_RESTAURANT)
    echo "Setting up Cafe/Restaurant configuration..."
    export DEFAULT_ORDER_TYPES="DINE_IN,TAKE_AWAY,DELIVERY"
    export ENABLE_TABLE_MANAGEMENT=true
    export ENABLE_KITCHEN_TICKET=true
    export ENABLE_LOYALTY=false
    export ENABLE_DELIVERY=true
    export ENABLE_INVENTORY=false
    export ENABLE_APPOINTMENTS=false
    export DEFAULT_TAX_RATE=0.1
    export DEFAULT_SERVICE_CHARGE=0.05
    ;;
  RETAIL_MINIMARKET)
    echo "Setting up Retail/Minimarket configuration..."
    export DEFAULT_ORDER_TYPES="WALK_IN"
    export ENABLE_TABLE_MANAGEMENT=false
    export ENABLE_KITCHEN_TICKET=false
    export ENABLE_LOYALTY=true
    export ENABLE_DELIVERY=false
    export ENABLE_INVENTORY=true
    export ENABLE_APPOINTMENTS=false
    export DEFAULT_TAX_RATE=0.1
    export DEFAULT_SERVICE_CHARGE=0
    ;;
  LAUNDRY)
    echo "Setting up Laundry configuration..."
    export DEFAULT_ORDER_TYPES="WALK_IN,DELIVERY"
    export ENABLE_TABLE_MANAGEMENT=false
    export ENABLE_KITCHEN_TICKET=false
    export ENABLE_LOYALTY=true
    export ENABLE_DELIVERY=true
    export ENABLE_INVENTORY=false
    export ENABLE_APPOINTMENTS=false
    export DEFAULT_TAX_RATE=0.1
    export DEFAULT_SERVICE_CHARGE=0
    export DEFAULT_TURNAROUND_DAYS=3
    ;;
  SERVICE_APPOINTMENT)
    echo "Setting up Service/Appointment configuration..."
    export DEFAULT_ORDER_TYPES="WALK_IN"
    export ENABLE_TABLE_MANAGEMENT=false
    export ENABLE_KITCHEN_TICKET=false
    export ENABLE_LOYALTY=true
    export ENABLE_DELIVERY=false
    export ENABLE_INVENTORY=false
    export ENABLE_APPOINTMENTS=true
    export DEFAULT_TAX_RATE=0.1
    export DEFAULT_SERVICE_CHARGE=0
    ;;
  DIGITAL_PPOB)
    echo "Setting up Digital/PPOB configuration..."
    export DEFAULT_ORDER_TYPES="WALK_IN"
    export ENABLE_TABLE_MANAGEMENT=false
    export ENABLE_KITCHEN_TICKET=false
    export ENABLE_LOYALTY=false
    export ENABLE_DELIVERY=false
    export ENABLE_INVENTORY=false
    export ENABLE_APPOINTMENTS=false
    export ENABLE_MULTI_LOCATION=true
    export DEFAULT_TAX_RATE=0
    export DEFAULT_SERVICE_CHARGE=0
    ;;
  *)
    echo "Error: Unknown business type '$BUSINESS_TYPE'"
    echo ""
    echo "Supported business types:"
    echo "  - CAFE_RESTAURANT"
    echo "  - RETAIL_MINIMARKET"
    echo "  - LAUNDRY"
    echo "  - SERVICE_APPOINTMENT"
    echo "  - DIGITAL_PPOB"
    exit 1
    ;;
esac

# Export for use in seed script
export BUSINESS_TYPE

echo ""
echo "Configuration:"
echo "  Order Types: $DEFAULT_ORDER_TYPES"
echo "  Table Management: $ENABLE_TABLE_MANAGEMENT"
echo "  Kitchen Ticket: $ENABLE_KITCHEN_TICKET"
echo "  Loyalty: $ENABLE_LOYALTY"
echo "  Delivery: $ENABLE_DELIVERY"
echo "  Inventory: $ENABLE_INVENTORY"
echo "  Appointments: $ENABLE_APPOINTMENTS"
echo "  Tax Rate: $DEFAULT_TAX_RATE"
echo "  Service Charge: $DEFAULT_SERVICE_CHARGE"
echo ""

# Run database seed with business type
echo "Running database seed..."
npm run db:seed

echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
echo "Your POS is now configured for: $BUSINESS_TYPE"
echo ""
echo "Next steps:"
echo "1. Start the application: npm run dev"
echo "2. Access the POS at: http://localhost:5000"
echo "3. Configure additional settings in the Management section"
echo ""
