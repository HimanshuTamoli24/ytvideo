import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
// Connect to MongoDB
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`MongoDB connected successfully: ${connectionInstance.connection.host}/${DB_NAME}`)

    } catch (error) {
        console.error("failed db connection", error)
        process.exit(1);
    }
}

export default connectDB