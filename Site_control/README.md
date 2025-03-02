# Ground Control Station (GCS) Setup Guide

## Prerequisites
- Git
- CMake
- Node.js and npm
- Terminal/Command Prompt
- Ubuntu (recommended for PX4 SITL)
## Refference video -https://www.youtube.com/watch?v=QTkLUARSv3c&t=2166s 
## refference github- https://github.com/PX4/WebGCS
## 1. PX4-Autopilot Installation
First, install PX4-Autopilot SITL (Software In The Loop):

1. Follow the Ubuntu development environment setup:
   ```bash
   # Visit and follow instructions at:
   https://docs.px4.io/main/en/dev_setup/dev_env_linux_ubuntu.html
   ```

2. Clone and build PX4-Autopilot:
   ```bash
   git clone https://github.com/PX4/PX4-Autopilot.git
   cd PX4-Autopilot
   bash ./Tools/setup/ubuntu.sh
   ```

## 2. MAVSDK Installation
```bash
# Clone MAVSDK repository
git clone https://github.com/mavlink/MAVSDK
cd MAVSDK

# Initialize and update submodules
git submodule update --init --recursive

# Build MAVSDK
cmake -DCMAKE_BUILD_TYPE=Debug -DBUILD_MAVSDK_SERVER=YES -Bbuild/default -H.
cmake --build build/default -j8
```

## 3. gRPC Bridge Setup
```bash
# Navigate to gRPC Bridge directory
cd gRPCBridge/

# Clone MAVSDK-Proto repository
git clone https://github.com/mavlink/MAVSDK-Proto

# Install required npm packages
npm install @grpc/grpc-js
npm install cors
npm install express
```

## 4. Web Application Setup
```bash
# Navigate to DHGCS directory
cd DHGCS

# Create new React application
npx create-react-app your-app-name

# Navigate to source directory
cd your-app-name/src
```

### File Replacements
1. Replace the following files from the repository:
   - `App.css`
   - `App.js`
2. Copy the `components` folder from the repository to the `src` directory

### Install Additional Requirements
```bash
# Return to app root directory
cd ..

# Install styled-components
npm install styled-components

# Install any other dependencies that show up as errors during runtime
```

## 5. Running the Complete System
You'll need 4 terminal windows to run all components:

### Terminal 1 - PX4 SITL
```bash
cd PX4-Autopilot
make px4_sitl gz_x500
```

### Terminal 2 - MAVSDK Server
```bash
cd MAVSDK
./build/default/src/mavsdk_server/src/mavsdk_server udp://:14550 -p 50000
```

### Terminal 3 - gRPC Bridge
```bash
cd DHWEBGCS/gRPCBridge
node ./src/mavsdk-rest.js
```

### Terminal 4 - React Web Application
```bash
cd your-app-name
npm start
```

## Verification Steps
1. Check each terminal for successful startup:
   - Terminal 1: PX4 SITL should show simulation running
   - Terminal 2: MAVSDK server should show connection status
   - Terminal 3: gRPC bridge should show server started
   - Terminal 4: React development server should launch
2. Web browser should automatically open to `localhost:3000`
3. Check browser console for any errors

## Troubleshooting
- If the web application fails to start, ensure all npm dependencies are installed
- Verify all ports are available (14550, 50000, and 3000)
- Check if MAVSDK server is properly connected to the PX4 SITL
- Ensure all repository files are correctly copied and placed in their respective directories
- For new dependency errors, install them using `npm install [package-name]`

## Directory Structure
```
Root/
├── PX4-Autopilot/
├── MAVSDK/
│   └── build/default/src/mavsdk_server/
├── DHGCS/
│   ├── gRPCBridge/
│   │   ├── MAVSDK-Proto/
│   │   └── src/
│   │       └── mavsdk-rest.js
│   └── your-app-name/
│       └── src/
│           ├── App.js
│           ├── App.css
│           └── components/
```
