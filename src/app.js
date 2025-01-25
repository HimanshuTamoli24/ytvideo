import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
const app = express()

// Middleware to parse JSON requests
app.use(cors())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(express.json())


export {
    app
}