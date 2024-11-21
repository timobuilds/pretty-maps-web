#!/bin/bash

# Kill any existing PM2 processes
pm2 kill

# Install dependencies
npm install

# Build the application
npm run build

# Start the application with PM2
pm2 start ecosystem.config.js --env production

# Save the PM2 process list
pm2 save

# Display logs
pm2 logs
