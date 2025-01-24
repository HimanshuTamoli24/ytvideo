import connectDB from "./src/db/connect.js";
import dotenv from "dotenv";
dotenv.config({
    path: ".env"
})
connectDB()