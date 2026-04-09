// functions/lib/responses.ts
export function success(data: any = null, message: string = 'success'): Response {
    return Response.json({ success: true, data, message });
}

export function error(message: string, status: number = 400): Response {
    return Response.json({ success: false, error: message }, { status });
}
