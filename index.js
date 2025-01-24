import connectDB from "./src/db/connect.js";
import dotenv from "dotenv";
import {app} from "./src/app.js"
dotenv.config({
    path: ".env"
})
connectDB()
    .then(() => {
        app.listen(process.env.PORT||9999, () => {
            console.log(`Server running on port ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error: ", err.message);
        process.exit(1);
    });