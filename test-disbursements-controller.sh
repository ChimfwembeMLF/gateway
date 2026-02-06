#!/bin/bash
# Quick test script for disbursements controller

cd /home/kangwa/Documents/Personal/gateway

echo "Running disbursements controller tests..."
npm test -- --testPathPattern="disbursements.controller.spec" --maxWorkers=1 --forceExit

echo ""
echo "Test run complete"
