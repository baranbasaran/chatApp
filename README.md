# Real-Time Chat Application

A modern real-time chat application built with React, Node.js, and Socket.IO.

## Features

- Real-time messaging with WebSocket reconnection handling
- Robust user authentication with token management
- Automatic WebSocket reconnection on connection loss
- Efficient chat state management
- Online/offline status
- Message delivery status
- Typing indicators
- User search
- Responsive design
- Error handling and logging

## Tech Stack

### Frontend

- React
- TypeScript
- TailwindCSS
- Socket.IO Client
- Context API for state management

### Backend

- Node.js
- Express
- MongoDB
- Socket.IO
- JWT Authentication

## Recent Improvements

- Enhanced WebSocket connection stability with automatic reconnection
- Improved authentication token handling
- Optimized chat state management to prevent unnecessary re-renders
- Added comprehensive error handling and logging
- Fixed race conditions in chat message handling
- Improved API endpoint consistency

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/chatApp.git
cd chatApp
```

2. Install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Environment Setup

Create a `.env` file in the backend directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

4. Start the application

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
chatApp/
├── backend/             # Backend server
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── app.ts
│   └── package.json
│
└── frontend/           # React frontend
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── types/
    │   └── App.tsx
    └── package.json
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
