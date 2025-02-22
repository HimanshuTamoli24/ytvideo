class Apiresponse {
    // constructor method to initialize properties of the class Apiresponse
    constructor(statusCode, data, message = "success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.status = statusCode < 400;
    }
}
export {
    Apiresponse,
};
