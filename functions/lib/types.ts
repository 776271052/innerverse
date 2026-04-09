// functions/lib/types.ts
export interface Env {
    DB: D1Database;
    IMAGE_BUCKET: R2Bucket;
    AI_TASK_QUEUE: Queue<any>;
    ADMIN_SECRET: string;
}

export type TaskType = 'moment' | 'chat' | 'htp';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Task {
    id: string;
    type: TaskType;
    status: TaskStatus;
    images: string | null;      // JSON array of R2 keys
    image_key: string | null;
    result: string | null;
    error: string | null;
    created_at: number;
    completed_at: number | null;
    updated_at: number;
}
