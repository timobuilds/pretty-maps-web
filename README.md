# Pretty Maps Web Generator

A web application that generates beautiful maps using the [prettymaps](https://github.com/marceloprates/prettymaps) library. Built with Next.js, React, and shadcn/ui.

## Features

- Enter any address to generate a map
- Choose from different map styles (Default, Minimal, Detailed)
- Adjust map scale
- Download generated maps

## Prerequisites

- Node.js (v16 or later)
- Python (v3.7 or later)
- pip (Python package manager)
- PM2 (for production deployment)

## Development Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Create the maps directory:
```bash
mkdir -p public/maps
```

4. Run the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Production Deployment

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Make the start script executable:
```bash
chmod +x start-production.sh
```

3. Start the production server:
```bash
./start-production.sh
```

The production server will:
- Install all dependencies
- Build the application
- Start the server using PM2 in cluster mode
- Auto-restart on crashes
- Load balance across all available CPU cores

### PM2 Commands

- View logs: `pm2 logs`
- Monitor processes: `pm2 monit`
- List processes: `pm2 list`
- Stop server: `pm2 stop pretty-maps-web`
- Restart server: `pm2 restart pretty-maps-web`
- Delete from PM2: `pm2 delete pretty-maps-web`

## Usage

1. Enter an address in the input field
2. Select a map style from the dropdown menu
3. Adjust the map scale using the slider
4. Click "Generate Map"
5. Once generated, you can download the map using the download button

## Technologies Used

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Python (prettymaps)
- PM2 Process Manager

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_MAX_MAP_SCALE=10
NEXT_PUBLIC_MIN_MAP_SCALE=1
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
MAP_CLEANUP_AGE_MS=3600000
```

## Security Features

- Input validation
- Rate limiting
- Secure file handling
- Error logging
- CORS protection

## License

MIT
