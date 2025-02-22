import { Schema, model } from "mongoose"
const subsriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
})

const Subscription = model("Subscription", subsriptionSchema)
export default Subscription