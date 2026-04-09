import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

export async function uploadImage(file) {
    const key = `${Date.now()}-${crypto.randomUUID()}.jpg`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type
    }));
    return `${process.env.R2_PUBLIC_URL}/${key}`;
}
