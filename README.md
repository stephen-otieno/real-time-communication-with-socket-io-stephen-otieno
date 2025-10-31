# Real-Time Chat Application 💬

A **real-time chat application** built with the **MERN Stack (MongoDB, Express, React, Node.js)** and **Socket.IO**.
Users can join chat rooms, send and receive instant messages, and view live user status — all in real time.

---

## 🖼️ Screenshots (Optional)
### Login
<img width="1039" height="810" alt="image" src="https://github.com/user-attachments/assets/7d2fa953-be61-4fa9-b7f6-1882a8007e0e" />

### Cht & Reactions
<img width="1127" height="797" alt="image" src="https://github.com/user-attachments/assets/13dab4fb-628a-4067-bc2b-adb57701885b" />

<img width="1127" height="778" alt="image" src="https://github.com/user-attachments/assets/eee4824e-24b1-47d7-99e5-19a7dcb7eb11" />


---


## 🚀 Features

* Real-time messaging using **Socket.IO**
* User authentication with JWT
* Multiple chat rooms support
* Online/offline user status
* Responsive UI (React + Tailwind CSS)
* MongoDB backend for storing users and messages
* REST API for user and message management

---

## 🧰 Tech Stack

| Layer                | Technology            |
| -------------------- | --------------------- |
| **Frontend**         | React, Tailwind CSS   |
| **Backend**          | Node.js, Express.js   |
| **Database**         | MongoDB with Mongoose |
| **Real-time Engine** | Socket.IO             |
| **Authentication**   | JSON Web Token (JWT)  |

---

## 📁 Project Structure

```
.
├── client/                # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── socket/
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                # Express backend
│   ├── models/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/PLP-MERN-Stack-Development/real-time-communication-with-socket-io-stephen-otieno.git
cd real-time-communication-with-socket-io-stephen-otieno
```

### 2️⃣ Install Backend Dependencies

```bash
cd server
npm install
```

### 3️⃣ Install Frontend Dependencies

```bash
cd ../client
npm install
```

### 4️⃣ Create an `.env` File in `/server`

```bash
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 5️⃣ Run the Application

**Run Backend:**

```bash
cd server
npm run dev
```

**Run Frontend:**

```bash
cd ../client
npm run dev
```

Frontend runs on `http://localhost:5173` (Vite default).
Backend runs on `http://localhost:5000`.

---

## 🔄 Real-Time Communication Flow

1. A user connects → Socket.IO establishes a WebSocket connection.
2. The server listens for `joinRoom`, `message`, `typing`, and `disconnect` events.
3. Messages are broadcast in real time to all users in the same room.
4. Data is stored in MongoDB for persistence.

---

## 🧪 Example Environment Setup

```
# Example .env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
JWT_SECRET=supersecretkey
```

---

## 🧱 API Endpoints (Backend)

| Method | Endpoint                | Description               |
| ------ | ----------------------- | ------------------------- |
| `POST` | `/api/auth/register`    | Register new user         |
| `POST` | `/api/auth/login`       | Authenticate user         |
| `GET`  | `/api/messages/:roomId` | Fetch messages for a room |

---

## 🧩 Socket.IO Events

| Event        | Direction       | Description               |
| ------------ | --------------- | ------------------------- |
| `connection` | Server → Client | When a user connects      |
| `joinRoom`   | Client → Server | Join a specific chat room |
| `message`    | Both            | Send/receive messages     |
| `typing`     | Client → Server | Notify typing status      |
| `disconnect` | Server → All    | User leaves chat          |

---


##  Deployment

You can deploy easily using:

* **Frontend:** Vercel / Netlify
* **Backend:** Render / Railway / Heroku
* **Database:** MongoDB Atlas

---


### This app demonstrates:

* Real-time web communication via **Socket.IO**
* A full-stack MERN architecture
* Secure user authentication
* Scalable event-driven design



