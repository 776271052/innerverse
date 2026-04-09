export function success(data = null, message = 'success') {
    return { success: true, data, message };
}

export function error(message, statusCode = 400) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}
