const asyncHandler = async (fn) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        console.error(error);
        res.status(err.code || 500).json({ message: 'Something went wrong' });
    }
}
export default asyncHandler