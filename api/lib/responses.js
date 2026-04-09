export function success(data = null, message = 'success') {
    return { success: true, data, message };
}

export function error(message, status = 400) {
    return { success: false, error: message, status };
}
