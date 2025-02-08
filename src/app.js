import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
const app = express()

// Middleware to parse JSON requests
app.use(cors({
}))
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(express.json())

// import routes
import userRoutes from "./routes/user.routes.js"
import SubscriptionRoutes from "./routes/subscriptions.routes.js"
import videoRoutes from "./routes/video.routes.js"
import tweetRoutes from "./routes/tweet.routes.js"

// routes declation 
app.use("/api/v1/users", userRoutes)

app.use("/api/v1/subscriptions", SubscriptionRoutes)
app.use("/api/v1/videos", videoRoutes)
app.use("/api/v1/tweet", tweetRoutes)
export {
    app
}