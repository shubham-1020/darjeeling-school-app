import express from "express";
import cors from "cors";
import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config(); // <-- load .env variables

const app = express();

// allow dynamic origins in production
const allowedOrigins = [
  "http://localhost:5173", 
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  } 
}));

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/auth", (req, res) => {
  try {
    const authParams = imagekit.getAuthenticationParameters(); 
    return res.json(authParams); 
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Auth generation failed" });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server running at port ${PORT}`));

