import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.BUCKET_NAME!
const PUBLIC_URL = process.env.TIGRIS_PUBLIC_URL!

export async function presignUpload(filename: string, contentType: string) {
  const ext = filename.match(/\.\w+$/)?.[0] ?? ''
  const key = `${randomUUID()}${ext}`
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  )
  return { uploadUrl, publicUrl: `${PUBLIC_URL}/${key}` }
}

export async function del(url: string) {
  const key = url.replace(`${PUBLIC_URL}/`, '')
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// Server-side direct upload (no presigning) — used by the one-off Blob→Tigris
// migration, where the file already lives in a server process as a Buffer.
export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }))
  return `${PUBLIC_URL}/${key}`
}
